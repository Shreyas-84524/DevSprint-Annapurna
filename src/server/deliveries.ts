/**
 * Server-only Deliveries & Volunteer Task DAL
 *
 * Implements volunteer available tasks discovery, atomic delivery acceptance
 * (with one-active-delivery enforcement and conflict handling), and authorized participant delivery projection.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import { AuthenticatedUser } from '@/server/auth';
import {
  VolunteerTaskSummaryDTO,
  AcceptDeliveryResponseDTO,
  DeliveryDetailDTO,
  DeliveryStatus,
  FoodType,
  ListingStatus,
} from '@/types/contracts';

export class DeliveryWorkflowError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'DeliveryWorkflowError';
    this.code = code;
    this.status = status;
  }
}

export interface AvailableTasksQuery {
  cursor?: string;
  limit?: number;
}

/**
 * Retrieves safe summaries of delivery tasks in 'awaiting_volunteer' status.
 * Enforces canonical volunteer role and excludes expired listings.
 */
export async function getAvailableVolunteerTasks(
  volunteerId: string,
  params?: AvailableTasksQuery,
  customClient?: any
): Promise<VolunteerTaskSummaryDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Enforce volunteer role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', volunteerId)
    .maybeSingle();

  if (profileErr || !profile) {
    throw new DeliveryWorkflowError('Volunteer profile not found.', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.role !== 'volunteer') {
    throw new DeliveryWorkflowError('Only volunteers can view available delivery tasks.', 'UNAUTHORIZED_VOLUNTEER', 403);
  }

  const limit = params?.limit && !isNaN(Number(params.limit)) ? Math.min(Number(params.limit), 50) : 20;

  // 2. Query available deliveries
  const { data: deliveries, error: deliveryErr } = await supabase
    .from('deliveries')
    .select('*, food_listings(*), claims(*)')
    .eq('status', 'awaiting_volunteer')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (deliveryErr || !deliveries) {
    return [];
  }

  const tasks: VolunteerTaskSummaryDTO[] = [];

  for (const d of deliveries) {
    const listing = Array.isArray(d.food_listings) ? d.food_listings[0] : d.food_listings;
    const claim = Array.isArray(d.claims) ? d.claims[0] : d.claims;

    if (!listing) continue;

    // Exclude expired listings
    if (new Date(listing.expires_at).getTime() <= Date.now()) {
      continue;
    }

    const dropoffArea = claim?.dropoff_address
      ? claim.dropoff_address.split(',')[0].trim()
      : 'Dropoff Area';

    tasks.push({
      deliveryId: d.id,
      listingId: d.listing_id,
      foodTitle: listing.title,
      quantity: Number(listing.quantity),
      unit: listing.unit,
      foodType: listing.food_type as FoodType,
      pickupArea: listing.general_area || 'Pickup Area',
      dropoffArea,
      distanceKm: undefined,
      expiresAt: listing.expires_at,
      status: d.status as DeliveryStatus,
    });
  }

  return tasks;
}

/**
 * Atomically accepts a delivery task for a volunteer.
 * Enforces one-active-delivery constraint and serializes competing volunteers (409 Conflict).
 */
export async function acceptDeliveryTask(
  deliveryId: string,
  volunteerId: string,
  idempotencyKey?: string | null,
  customClient?: any
): Promise<AcceptDeliveryResponseDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Enforce volunteer role
  const { data: volunteer, error: volErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', volunteerId)
    .maybeSingle();

  if (volErr || !volunteer) {
    throw new DeliveryWorkflowError('Volunteer profile not found.', 'PROFILE_NOT_FOUND', 404);
  }

  if (volunteer.role !== 'volunteer') {
    throw new DeliveryWorkflowError('Only volunteers can accept delivery tasks.', 'UNAUTHORIZED_VOLUNTEER', 403);
  }

  // 2. Fast check: is this delivery already assigned to this volunteer (replay)?
  const { data: existingAssignment } = await supabase
    .from('deliveries')
    .select('id, volunteer_id, status')
    .eq('id', deliveryId)
    .eq('volunteer_id', volunteerId)
    .maybeSingle();

  if (existingAssignment) {
    return {
      deliveryId: existingAssignment.id,
      volunteerId,
      status: 'assigned',
      replayed: true,
    };
  }

  // 3. Fast check: does volunteer already have an active non-terminal delivery?
  const { data: activeDeliveries } = await supabase
    .from('deliveries')
    .select('id')
    .eq('volunteer_id', volunteerId)
    .not('status', 'in', '("qc_failed","receipt_confirmed","cancelled")')
    .neq('id', deliveryId)
    .limit(1);

  if (activeDeliveries && activeDeliveries.length > 0) {
    throw new DeliveryWorkflowError(
      'Volunteer already has an active delivery.',
      'VOLUNTEER_ACTIVE_DELIVERY_EXISTS',
      409
    );
  }

  // 4. Invoke atomic stored procedure
  const { data, error } = await supabase.rpc('accept_delivery_task', {
    p_delivery_id: deliveryId,
    p_volunteer_id: volunteerId,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('DELIVERY_NOT_FOUND') || error.code === 'P0002') {
      throw new DeliveryWorkflowError('Delivery not found.', 'DELIVERY_NOT_FOUND', 404);
    }
    if (
      msg.includes('VOLUNTEER_ACTIVE_DELIVERY_EXISTS') ||
      msg.includes('idx_deliveries_one_active_volunteer') ||
      error.code === '23505'
    ) {
      throw new DeliveryWorkflowError(
        'Volunteer already has an active delivery.',
        'VOLUNTEER_ACTIVE_DELIVERY_EXISTS',
        409
      );
    }
    if (msg.includes('DELIVERY_ALREADY_ASSIGNED')) {
      throw new DeliveryWorkflowError(
        'Delivery has already been assigned to another volunteer.',
        'DELIVERY_ALREADY_ASSIGNED',
        409
      );
    }
    if (msg.includes('UNAUTHORIZED_VOLUNTEER') || error.code === '42501') {
      throw new DeliveryWorkflowError('Caller is not an authorized volunteer.', 'UNAUTHORIZED_VOLUNTEER', 403);
    }
    if (msg.includes('LISTING_EXPIRED')) {
      throw new DeliveryWorkflowError('Listing has expired.', 'LISTING_EXPIRED', 410);
    }

    throw new DeliveryWorkflowError(error.message || 'Failed to accept delivery task.', 'ACCEPT_DELIVERY_FAILED', 500);
  }

  return {
    deliveryId: data.delivery_id,
    volunteerId: data.volunteer_id,
    status: 'assigned',
    replayed: data.replayed === true,
  };
}

/**
 * Projects full delivery details strictly to authorized workflow participants.
 * Participants: donor, requester, assigned volunteer, or admin.
 * Unrelated users receive 403 Forbidden.
 */
export async function getDeliveryDetail(
  deliveryId: string,
  caller: AuthenticatedUser,
  customClient?: any
): Promise<DeliveryDetailDTO> {
  const supabase = customClient || getServiceRoleClient();

  // 1. Fetch delivery record
  const { data: delivery, error: delErr } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', deliveryId)
    .maybeSingle();

  if (delErr || !delivery) {
    throw new DeliveryWorkflowError('Delivery not found.', 'DELIVERY_NOT_FOUND', 404);
  }

  // 2. Participant authorization check
  const isParticipant =
    caller.id === delivery.donor_id ||
    caller.id === delivery.requester_id ||
    (delivery.volunteer_id && caller.id === delivery.volunteer_id) ||
    caller.role === 'admin';

  if (!isParticipant) {
    throw new DeliveryWorkflowError(
      'You are not an authorized participant for this delivery.',
      'FORBIDDEN_NOT_PARTICIPANT',
      403
    );
  }

  // 3. Fetch listing, pickup details, claim, and user profiles
  const [
    { data: listing },
    { data: pickupDetails },
    { data: claim },
    { data: donorProfile },
    { data: requesterProfile },
    { data: volunteerProfile },
  ] = await Promise.all([
    supabase.from('food_listings').select('*').eq('id', delivery.listing_id).maybeSingle(),
    supabase.from('listing_pickup_details').select('*').eq('listing_id', delivery.listing_id).maybeSingle(),
    supabase.from('claims').select('*').eq('id', delivery.claim_id).maybeSingle(),
    supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.donor_id).maybeSingle(),
    supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.requester_id).maybeSingle(),
    delivery.volunteer_id
      ? supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.volunteer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!listing) {
    throw new DeliveryWorkflowError('Listing record missing for delivery.', 'LISTING_NOT_FOUND', 404);
  }

  return {
    id: delivery.id,
    listingId: delivery.listing_id,
    claimId: delivery.claim_id,
    status: delivery.status as DeliveryStatus,
    rowVersion: delivery.row_version,
    donor: {
      id: delivery.donor_id,
      displayName: donorProfile?.display_name || 'Donor',
      phone: donorProfile?.phone || undefined,
    },
    requester: {
      id: delivery.requester_id,
      displayName: requesterProfile?.display_name || 'Requester',
      phone: requesterProfile?.phone || undefined,
    },
    volunteer: delivery.volunteer_id
      ? {
          id: delivery.volunteer_id,
          displayName: volunteerProfile?.display_name || 'Volunteer',
          phone: volunteerProfile?.phone || undefined,
        }
      : null,
    listing: {
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
    },
    pickupLocation: pickupDetails
      ? {
          address: pickupDetails.pickup_address,
          latitude: Number(pickupDetails.latitude),
          longitude: Number(pickupDetails.longitude),
          instructions: pickupDetails.pickup_instructions,
          contactPhone: pickupDetails.contact_phone,
        }
      : undefined,
    dropoffLocation: claim
      ? {
          address: claim.dropoff_address,
          latitude: Number(claim.dropoff_latitude),
          longitude: Number(claim.dropoff_longitude),
          instructions: claim.dropoff_instructions,
          contactPhone: claim.dropoff_contact_phone,
        }
      : undefined,
    assignedAt: delivery.assigned_at,
    createdAt: delivery.created_at,
    updatedAt: delivery.updated_at,
  };
}
