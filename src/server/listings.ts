/**
 * Server-only Listings & Claim DAL
 *
 * Implements donor listing creation, updates with optimistic concurrency (row version check),
 * idempotent publish transitions, public-safe nearby discovery projection, and atomic whole-listing claims.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  CreateListingRequest,
  UpdateListingRequest,
  ListingDTO,
  PublicListingSummaryDTO,
  ClaimListingRequest,
  ClaimResponseDTO,
  FoodType,
  ListingStatus,
  FOOD_TYPES,
} from '@/types/contracts';

export class ListingWorkflowError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ListingWorkflowError';
    this.code = code;
    this.status = status;
  }
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Creates a new donor-owned food listing (draft or immediately published).
 * Enforces donor role and phone verification, validates fields, and records pickup details.
 */
export async function createListing(
  donorId: string,
  input: CreateListingRequest,
  customClient?: any
): Promise<ListingDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Enforce verified donor role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, is_verified, phone')
    .eq('id', donorId)
    .maybeSingle();

  if (profileErr || !profile) {
    throw new ListingWorkflowError('Donor profile not found.', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.role !== 'donor') {
    throw new ListingWorkflowError('Only donors can create food listings.', 'FORBIDDEN_ROLE', 403);
  }

  if (!profile.is_verified) {
    throw new ListingWorkflowError(
      'Donor must be phone-verified before creating food listings.',
      'DONOR_NOT_VERIFIED',
      403
    );
  }

  // 2. Validate input fields
  const trimmedTitle = input.title?.trim();
  if (!trimmedTitle || trimmedTitle.length < 2 || trimmedTitle.length > 200) {
    throw new ListingWorkflowError(
      'Title is required and must be between 2 and 200 characters.',
      'INVALID_TITLE',
      400
    );
  }

  const quantity = Number(input.quantity);
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    throw new ListingWorkflowError('Quantity must be a positive number.', 'INVALID_QUANTITY', 400);
  }

  const trimmedUnit = input.unit?.trim();
  if (!trimmedUnit || trimmedUnit.length < 1 || trimmedUnit.length > 50) {
    throw new ListingWorkflowError('Unit is required and must be between 1 and 50 characters.', 'INVALID_UNIT', 400);
  }

  if (!input.foodType || !FOOD_TYPES.includes(input.foodType as FoodType)) {
    throw new ListingWorkflowError(
      `Invalid food type. Must be one of: ${FOOD_TYPES.join(', ')}.`,
      'INVALID_FOOD_TYPE',
      400
    );
  }

  if (!input.expiresAt) {
    throw new ListingWorkflowError('Expiry timestamp is required.', 'INVALID_EXPIRY', 400);
  }

  const expiryDate = new Date(input.expiresAt);
  if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
    throw new ListingWorkflowError('Expiry timestamp must be in the future.', 'INVALID_EXPIRY', 400);
  }

  // 3. Resolve pickup location
  let location: any = null;
  if (input.pickupLocationId) {
    const { data: locData, error: locErr } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('id', input.pickupLocationId)
      .eq('user_id', donorId)
      .maybeSingle();

    if (locErr || !locData) {
      throw new ListingWorkflowError('Pickup location not found for this donor.', 'LOCATION_NOT_FOUND', 404);
    }
    location = locData;
  } else {
    const { data: defaultLocs } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('user_id', donorId)
      .order('is_default', { ascending: false })
      .limit(1);

    if (defaultLocs && defaultLocs.length > 0) {
      location = defaultLocs[0];
    } else {
      throw new ListingWorkflowError(
        'A saved pickup location is required to create a food listing.',
        'MISSING_PICKUP_LOCATION',
        400
      );
    }
  }

  const generalArea = location.city || location.label || 'Pickup Area';
  const contactPhone = profile.phone || '+919000000000';
  const initialStatus: ListingStatus = input.publishImmediately ? 'published' : 'draft';

  // Production uses one database transaction for the listing, private pickup
  // details, and optional prepared image registration. Injected clients retain
  // the explicit query path below for deterministic unit-test fixtures.
  if (!customClient) {
    const { data, error } = await supabase.rpc('create_food_listing', {
      p_donor_id: donorId,
      p_title: trimmedTitle,
      p_description: input.description?.trim() || null,
      p_quantity: quantity,
      p_unit: trimmedUnit,
      p_food_type: input.foodType,
      p_dietary_tags: input.dietaryTags || [],
      p_expires_at: expiryDate.toISOString(),
      p_pickup_location_id: location.id,
      p_publish_immediately: input.publishImmediately === true,
      p_prepared_image_token: input.preparedImageToken || null,
    });

    if (error || !data) {
      const code = error?.message?.includes('INVALID_IMAGE') ? 'INVALID_IMAGE_TOKEN' :
        error?.message?.includes('LOCATION_NOT_FOUND') ? 'LOCATION_NOT_FOUND' : 'INSERT_LISTING_FAILED';
      const status = code === 'INVALID_IMAGE_TOKEN' ? 400 : code === 'LOCATION_NOT_FOUND' ? 404 : 500;
      throw new ListingWorkflowError(error?.message || 'Failed to create food listing.', code, status);
    }

    return {
      id: data.id,
      donorId: data.donor_id,
      title: data.title,
      description: data.description,
      quantity: Number(data.quantity),
      unit: data.unit,
      foodType: data.food_type as FoodType,
      dietaryTags: data.dietary_tags || [],
      status: data.status as ListingStatus,
      expiresAt: data.expires_at,
      pickupLocationId: data.pickup_location_id,
      generalArea: data.general_area,
      rowVersion: data.row_version,
      imageUrl: input.preparedImageToken
        ? `/storage/v1/object/public/listing-images/${input.preparedImageToken}`
        : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // 4. Insert into food_listings
  const { data: newListing, error: insertErr } = await supabase
    .from('food_listings')
    .insert({
      donor_id: donorId,
      title: trimmedTitle,
      description: input.description?.trim() || null,
      quantity,
      unit: trimmedUnit,
      food_type: input.foodType,
      dietary_tags: input.dietaryTags || [],
      status: initialStatus,
      expires_at: expiryDate.toISOString(),
      pickup_location_id: location.id,
      general_area: generalArea,
      row_version: 1,
    })
    .select('*')
    .single();

  if (insertErr || !newListing) {
    throw new ListingWorkflowError(
      insertErr?.message || 'Failed to create food listing.',
      'INSERT_LISTING_FAILED',
      500
    );
  }

  // 5. Insert into listing_pickup_details (Strict 1:1 privacy table)
  const { error: pickupErr } = await supabase
    .from('listing_pickup_details')
    .insert({
      listing_id: newListing.id,
      pickup_location_id: location.id,
      pickup_address: location.address || location.label,
      address_line2: location.address_line2 || null,
      city: location.city || null,
      state: location.state || null,
      postal_code: location.postal_code || null,
      latitude: location.latitude,
      longitude: location.longitude,
      pickup_instructions: null,
      contact_phone: contactPhone,
    });

  if (pickupErr) {
    throw new ListingWorkflowError(
      pickupErr.message || 'Failed to record listing pickup details.',
      'INSERT_PICKUP_DETAILS_FAILED',
      500
    );
  }

  // 6. Optional image registration
  let imageUrl: string | null = null;
  if (input.preparedImageToken) {
    await supabase.from('listing_images').insert({
      listing_id: newListing.id,
      storage_path: input.preparedImageToken,
      file_name: 'listing-image.webp',
      file_size_bytes: 1024,
      mime_type: 'image/webp',
      display_order: 0,
    });
    imageUrl = `/storage/v1/object/public/listing-images/${input.preparedImageToken}`;
  }

  return {
    id: newListing.id,
    donorId: newListing.donor_id,
    title: newListing.title,
    description: newListing.description,
    quantity: Number(newListing.quantity),
    unit: newListing.unit,
    foodType: newListing.food_type as FoodType,
    dietaryTags: newListing.dietary_tags || [],
    status: newListing.status as ListingStatus,
    expiresAt: newListing.expires_at,
    pickupLocationId: newListing.pickup_location_id,
    generalArea: newListing.general_area,
    rowVersion: newListing.row_version,
    imageUrl,
    createdAt: newListing.created_at,
    updatedAt: newListing.updated_at,
  };
}

/**
 * Updates allowed listing fields with optimistic concurrency control (row version check).
 */
export async function updateListing(
  donorId: string,
  listingId: string,
  input: UpdateListingRequest,
  customClient?: any
): Promise<ListingDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Fetch current listing
  const { data: listing, error: fetchErr } = await supabase
    .from('food_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (fetchErr || !listing) {
    throw new ListingWorkflowError('Listing not found.', 'LISTING_NOT_FOUND', 404);
  }

  // 2. Ownership check
  if (listing.donor_id !== donorId) {
    throw new ListingWorkflowError('You do not own this listing.', 'FORBIDDEN', 403);
  }

  // 3. Row version validation (optimistic concurrency)
  if (input.rowVersion === undefined || input.rowVersion === null) {
    throw new ListingWorkflowError('rowVersion is required for updates.', 'MISSING_ROW_VERSION', 400);
  }

  if (Number(listing.row_version) !== Number(input.rowVersion)) {
    throw new ListingWorkflowError(
      'Listing has been modified by another request.',
      'STALE_ROW_VERSION',
      409
    );
  }

  // 4. Status check
  if (!['draft', 'published'].includes(listing.status)) {
    throw new ListingWorkflowError(
      `Listing in status '${listing.status}' cannot be updated.`,
      'LISTING_NOT_EDITABLE',
      409
    );
  }

  // 5. Expiry check
  if (new Date(listing.expires_at).getTime() <= Date.now()) {
    throw new ListingWorkflowError('Listing has expired and cannot be updated.', 'LISTING_EXPIRED', 410);
  }

  // 6. Validate updated values
  const updates: Record<string, any> = {};

  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      throw new ListingWorkflowError('Title must be between 2 and 200 characters.', 'INVALID_TITLE', 400);
    }
    updates.title = trimmed;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.quantity !== undefined) {
    const qty = Number(input.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new ListingWorkflowError('Quantity must be a positive number.', 'INVALID_QUANTITY', 400);
    }
    updates.quantity = qty;
  }

  if (input.unit !== undefined) {
    const unit = input.unit.trim();
    if (unit.length < 1 || unit.length > 50) {
      throw new ListingWorkflowError('Unit must be between 1 and 50 characters.', 'INVALID_UNIT', 400);
    }
    updates.unit = unit;
  }

  if (input.foodType !== undefined) {
    if (!FOOD_TYPES.includes(input.foodType as FoodType)) {
      throw new ListingWorkflowError(
        `Invalid food type. Must be one of: ${FOOD_TYPES.join(', ')}.`,
        'INVALID_FOOD_TYPE',
        400
      );
    }
    updates.food_type = input.foodType;
  }

  if (input.dietaryTags !== undefined) {
    updates.dietary_tags = input.dietaryTags;
  }

  if (input.expiresAt !== undefined) {
    const expiry = new Date(input.expiresAt);
    if (isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      throw new ListingWorkflowError('Expiry timestamp must be in the future.', 'INVALID_EXPIRY', 400);
    }
    updates.expires_at = expiry.toISOString();
  }

  if (input.pickupLocationId !== undefined) {
    const { data: locData, error: locErr } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('id', input.pickupLocationId)
      .eq('user_id', donorId)
      .maybeSingle();

    if (locErr || !locData) {
      throw new ListingWorkflowError('Pickup location not found for this donor.', 'LOCATION_NOT_FOUND', 404);
    }
    updates.pickup_location_id = locData.id;
    updates.general_area = locData.city || locData.label || 'Pickup Area';

    if (customClient) {
      await supabase
        .from('listing_pickup_details')
        .update({
          pickup_location_id: locData.id,
          pickup_address: locData.address || locData.label,
          address_line2: locData.address_line2 || null,
          city: locData.city || null,
          state: locData.state || null,
          postal_code: locData.postal_code || null,
          latitude: locData.latitude,
          longitude: locData.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('listing_id', listingId);
    }
  }

  if (!customClient) {
    const changes: Record<string, any> = {};
    if (input.title !== undefined) changes.title = updates.title;
    if (input.description !== undefined) changes.description = updates.description;
    if (input.quantity !== undefined) changes.quantity = updates.quantity;
    if (input.unit !== undefined) changes.unit = updates.unit;
    if (input.foodType !== undefined) changes.foodType = updates.food_type;
    if (input.dietaryTags !== undefined) changes.dietaryTags = updates.dietary_tags;
    if (input.expiresAt !== undefined) changes.expiresAt = updates.expires_at;
    if (input.pickupLocationId !== undefined) changes.pickupLocationId = input.pickupLocationId;

    const { data, error } = await supabase.rpc('update_food_listing', {
      p_listing_id: listingId,
      p_donor_id: donorId,
      p_expected_version: input.rowVersion,
      p_changes: changes,
    });

    if (error || !data) {
      const message = error?.message || '';
      if (message.includes('STALE_OR_NOT_EDITABLE') || error?.code === '40001') {
        throw new ListingWorkflowError('Listing changed or is no longer editable.', 'STALE_ROW_VERSION', 409);
      }
      if (message.includes('LOCATION_NOT_FOUND')) {
        throw new ListingWorkflowError('Pickup location not found.', 'LOCATION_NOT_FOUND', 404);
      }
      throw new ListingWorkflowError(message || 'Failed to update food listing.', 'UPDATE_LISTING_FAILED', 500);
    }

    return {
      id: data.id,
      donorId: data.donor_id,
      title: data.title,
      description: data.description,
      quantity: Number(data.quantity),
      unit: data.unit,
      foodType: data.food_type as FoodType,
      dietaryTags: data.dietary_tags || [],
      status: data.status as ListingStatus,
      expiresAt: data.expires_at,
      pickupLocationId: data.pickup_location_id,
      generalArea: data.general_area,
      rowVersion: data.row_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  updates.row_version = listing.row_version + 1;
  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from('food_listings')
    .update(updates)
    .eq('id', listingId)
    .select('*')
    .single();

  if (updateErr || !updated) {
    throw new ListingWorkflowError(
      updateErr?.message || 'Failed to update food listing.',
      'UPDATE_LISTING_FAILED',
      500
    );
  }

  return {
    id: updated.id,
    donorId: updated.donor_id,
    title: updated.title,
    description: updated.description,
    quantity: Number(updated.quantity),
    unit: updated.unit,
    foodType: updated.food_type as FoodType,
    dietaryTags: updated.dietary_tags || [],
    status: updated.status as ListingStatus,
    expiresAt: updated.expires_at,
    pickupLocationId: updated.pickup_location_id,
    generalArea: updated.general_area,
    rowVersion: updated.row_version,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Transitions a draft listing to published state idempotently.
 */
export async function publishListing(
  donorId: string,
  listingId: string,
  customClient?: any
): Promise<ListingDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Fetch listing
  const { data: listing, error: fetchErr } = await supabase
    .from('food_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (fetchErr || !listing) {
    throw new ListingWorkflowError('Listing not found.', 'LISTING_NOT_FOUND', 404);
  }

  // 2. Ownership check
  if (listing.donor_id !== donorId) {
    throw new ListingWorkflowError('You do not own this listing.', 'FORBIDDEN', 403);
  }

  // 3. Idempotent return if already published
  if (listing.status === 'published') {
    return {
      id: listing.id,
      donorId: listing.donor_id,
      title: listing.title,
      description: listing.description,
      quantity: Number(listing.quantity),
      unit: listing.unit,
      foodType: listing.food_type as FoodType,
      dietaryTags: listing.dietary_tags || [],
      status: listing.status as ListingStatus,
      expiresAt: listing.expires_at,
      pickupLocationId: listing.pickup_location_id,
      generalArea: listing.general_area,
      rowVersion: listing.row_version,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
    };
  }

  // 4. Status validation
  if (listing.status !== 'draft') {
    throw new ListingWorkflowError(
      `Listing cannot be published from status '${listing.status}'.`,
      'INVALID_STATUS_TRANSITION',
      409
    );
  }

  // 5. Expiry check
  if (new Date(listing.expires_at).getTime() <= Date.now()) {
    throw new ListingWorkflowError('Listing has expired and cannot be published.', 'LISTING_EXPIRED', 410);
  }

  // 6. Update to published
  const { data: updated, error: updateErr } = await supabase
    .from('food_listings')
    .update({
      status: 'published',
      row_version: listing.row_version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('*')
    .single();

  if (updateErr || !updated) {
    throw new ListingWorkflowError(
      updateErr?.message || 'Failed to publish listing.',
      'PUBLISH_LISTING_FAILED',
      500
    );
  }

  return {
    id: updated.id,
    donorId: updated.donor_id,
    title: updated.title,
    description: updated.description,
    quantity: Number(updated.quantity),
    unit: updated.unit,
    foodType: updated.food_type as FoodType,
    dietaryTags: updated.dietary_tags || [],
    status: updated.status as ListingStatus,
    expiresAt: updated.expires_at,
    pickupLocationId: updated.pickup_location_id,
    generalArea: updated.general_area,
    rowVersion: updated.row_version,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export interface NearbyListingsQuery {
  lat?: number;
  lng?: number;
  radius?: number;
  cursor?: string;
  limit?: number;
}

/**
 * Public-safe discovery query for published and unexpired listings.
 * STRICT PRIVACY: Omits exact street address, coordinates, and contact phone.
 */
export async function getNearbyListings(
  query: NearbyListingsQuery,
  customClient?: any
): Promise<PublicListingSummaryDTO[]> {
  const supabase = customClient || getServiceRoleClient();
  const nowIso = new Date().toISOString();

  // 1. Fetch published, unexpired listings
  const { data: listings, error: fetchErr } = await supabase
    .from('food_listings')
    .select('*, listing_pickup_details(city, latitude, longitude), listing_images(storage_path)')
    .eq('status', 'published')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (fetchErr || !listings) {
    return [];
  }

  const userLat = query.lat !== undefined && !isNaN(Number(query.lat)) ? Number(query.lat) : undefined;
  const userLng = query.lng !== undefined && !isNaN(Number(query.lng)) ? Number(query.lng) : undefined;
  const maxRadiusKm = query.radius && !isNaN(Number(query.radius)) ? Math.min(Number(query.radius), 50) : 10;
  const limit = query.limit && !isNaN(Number(query.limit)) ? Math.min(Number(query.limit), 50) : 20;

  const results: PublicListingSummaryDTO[] = [];

  for (const item of listings) {
    const pickup = Array.isArray(item.listing_pickup_details)
      ? item.listing_pickup_details[0]
      : item.listing_pickup_details;

    let distanceKm: number | undefined = undefined;
    if (userLat !== undefined && userLng !== undefined && pickup?.latitude && pickup?.longitude) {
      const dist = calculateHaversineDistanceKm(
        userLat,
        userLng,
        Number(pickup.latitude),
        Number(pickup.longitude)
      );
      if (dist > maxRadiusKm) {
        continue; // Outside search radius
      }
      distanceKm = Math.round(dist * 10) / 10;
    }

    const image = Array.isArray(item.listing_images) && item.listing_images.length > 0
      ? item.listing_images[0]
      : item.listing_images;

    const imageUrl = image?.storage_path
      ? `/storage/v1/object/public/listing-images/${image.storage_path}`
      : null;

    // Strict privacy projection: only safe summaries
    results.push({
      id: item.id,
      title: item.title,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      foodType: item.food_type as FoodType,
      dietaryTags: item.dietary_tags || [],
      expiresAt: item.expires_at,
      area: item.general_area || null,
      city: pickup?.city || null,
      distanceKm,
      imageUrl,
    });

    if (results.length >= limit) {
      break;
    }
  }

  // Sort by distance if location provided
  if (userLat !== undefined && userLng !== undefined) {
    results.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
  }

  return results;
}

/**
 * Atomically claims a food listing for an authorized requester.
 * Calls stored procedure claim_food_listing with idempotency key and row-level locking.
 */
export async function claimListing(
  listingId: string,
  requesterId: string,
  input: ClaimListingRequest,
  idempotencyKey?: string | null,
  customClient?: any
): Promise<ClaimResponseDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Verify requester role and phone verification
  const { data: requester, error: reqErr } = await supabase
    .from('profiles')
    .select('id, role, is_verified')
    .eq('id', requesterId)
    .maybeSingle();

  if (reqErr || !requester) {
    throw new ListingWorkflowError('Requester profile not found.', 'PROFILE_NOT_FOUND', 404);
  }

  if (requester.role !== 'requester') {
    throw new ListingWorkflowError('Only requesters can claim food listings.', 'UNAUTHORIZED_REQUESTER', 403);
  }

  if (!requester.is_verified) {
    throw new ListingWorkflowError(
      'Requester must be phone-verified before claiming food listings.',
      'REQUESTER_NOT_VERIFIED',
      403
    );
  }

  // 2. Invoke atomic stored procedure
  const { data, error } = await supabase.rpc('claim_food_listing', {
    p_listing_id: listingId,
    p_requester_id: requesterId,
    p_delivery_location_id: input.deliveryLocationId || null,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('LISTING_NOT_FOUND') || error.code === 'P0002') {
      throw new ListingWorkflowError('Listing not found.', 'LISTING_NOT_FOUND', 404);
    }
    if (msg.includes('LOCATION_NOT_FOUND')) {
      throw new ListingWorkflowError('Delivery location not found.', 'LOCATION_NOT_FOUND', 404);
    }
    if (msg.includes('LISTING_EXPIRED')) {
      throw new ListingWorkflowError('Listing has expired and cannot be claimed.', 'LISTING_EXPIRED', 410);
    }
    if (
      msg.includes('LISTING_ALREADY_CLAIMED') ||
      msg.includes('idx_claims_one_active_listing') ||
      error.code === '23505'
    ) {
      throw new ListingWorkflowError('Listing has already been claimed.', 'CLAIM_CONFLICT', 409);
    }
    if (msg.includes('UNAUTHORIZED_REQUESTER') || error.code === '42501') {
      throw new ListingWorkflowError('Caller is not an authorized requester.', 'UNAUTHORIZED_REQUESTER', 403);
    }
    if (msg.includes('IDEMPOTENCY_KEY_REUSED')) {
      throw new ListingWorkflowError('Idempotency key was reused for a different claim.', 'IDEMPOTENCY_KEY_REUSED', 409);
    }

    throw new ListingWorkflowError(error.message || 'Failed to claim food listing.', 'CLAIM_FAILED', 500);
  }

  return {
    claimId: data.claim_id,
    deliveryId: data.delivery_id,
    listingId: data.listing_id,
    status: 'claimed',
    replayed: data.status === 'replayed',
  };
}
