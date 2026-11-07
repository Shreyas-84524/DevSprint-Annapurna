/**
 * Server-only Deliveries & Volunteer Task DAL
 *
 * Implements volunteer available tasks discovery, atomic delivery acceptance
 * (with one-active-delivery enforcement and conflict handling), and authorized participant delivery projection.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import { createWorkflowNotification } from '@/server/notifications';
import { AuthenticatedUser } from '@/server/auth';
import {
  VolunteerTaskSummaryDTO,
  AcceptDeliveryResponseDTO,
  DeliveryDetailDTO,
  DeliveryStatus,
  DeliveryAction,
  DeliveryTransitionRequest,
  DeliveryTransitionResponseDTO,
  DeliveryLocationInput,
  DeliveryLocationDTO,
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

    const dropoffArea = claim?.dropoff_area || 'Recipient service area';

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

  // Fast capacity feedback; the database function repeats this check while
  // holding the authoritative delivery lock.
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

  // Invoke the atomic stored procedure. Replay semantics are decided there so
  // the key must match the exact original command.
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
    if (msg.includes('IDEMPOTENCY_KEY_REUSED')) {
      throw new DeliveryWorkflowError('Idempotency key was reused for a different assignment.', 'IDEMPOTENCY_KEY_REUSED', 409);
    }

    throw new DeliveryWorkflowError(error.message || 'Failed to accept delivery task.', 'ACCEPT_DELIVERY_FAILED', 500);
  }

  // Dispatch in-app notifications to donor and requester (idempotent, retry-safe)
  try {
    const { data: deliv } = await supabase
      .from('deliveries')
      .select('donor_id, requester_id')
      .eq('id', data.delivery_id)
      .maybeSingle();

    if (deliv) {
      if (deliv.donor_id) {
        await createWorkflowNotification(
          {
            userId: deliv.donor_id,
            title: 'Volunteer Assigned',
            message: 'A volunteer has accepted the delivery for your food listing.',
            type: 'delivery',
            link: '/dashboard/donor',
            idempotencyKey: `notif-assigned-donor-${data.delivery_id}`,
          },
          supabase
        );
      }
      if (deliv.requester_id) {
        await createWorkflowNotification(
          {
            userId: deliv.requester_id,
            title: 'Volunteer Assigned',
            message: 'A volunteer has accepted your delivery and will pick up the food soon.',
            type: 'delivery',
            link: '/dashboard/beneficiary',
            idempotencyKey: `notif-assigned-requester-${data.delivery_id}`,
          },
          supabase
        );
      }
    }
  } catch (_err) {
    // Non-fatal notification error
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
    { data: qc },
    { data: latestLocations },
  ] = await Promise.all([
    supabase.from('food_listings').select('*').eq('id', delivery.listing_id).maybeSingle(),
    supabase.from('listing_pickup_details').select('*').eq('listing_id', delivery.listing_id).maybeSingle(),
    supabase.from('claims').select('*').eq('id', delivery.claim_id).maybeSingle(),
    supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.donor_id).maybeSingle(),
    supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.requester_id).maybeSingle(),
    delivery.volunteer_id
      ? supabase.from('profiles').select('id, display_name, phone').eq('id', delivery.volunteer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    customClient
      ? Promise.resolve({ data: null })
      : supabase.from('delivery_qc').select('result, notes, checked_at').eq('delivery_id', deliveryId).maybeSingle(),
    customClient
      ? Promise.resolve({ data: [] })
      : supabase.from('delivery_locations').select('*').eq('delivery_id', deliveryId).order('sequence', { ascending: false }).limit(1),
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
    allowedNextActions: allowedActionsFor(delivery, caller),
    qc: qc ? {
      result: qc.result,
      notes: qc.notes,
      checkedAt: qc.checked_at,
    } : null,
    latestLocation: latestLocations?.[0] ? mapLocation(latestLocations[0]) : null,
    createdAt: delivery.created_at,
    updatedAt: delivery.updated_at,
  };
}

function allowedActionsFor(delivery: any, caller: AuthenticatedUser): DeliveryAction[] {
  const actions: DeliveryAction[] = [];
  const isVolunteer = caller.id === delivery.volunteer_id;
  const isRequester = caller.id === delivery.requester_id;
  if (isVolunteer && delivery.status === 'assigned') actions.push('arrive_pickup');
  if (isVolunteer && delivery.status === 'at_pickup') actions.push('qc');
  if (isVolunteer && delivery.status === 'qc_passed') actions.push('collect');
  if (isVolunteer && delivery.status === 'collected') actions.push('start_dropoff');
  if (isVolunteer && delivery.status === 'en_route_dropoff') actions.push('handover');
  if (isRequester && delivery.status === 'handed_over') actions.push('confirm_receipt');
  if (!['qc_failed', 'receipt_confirmed', 'cancelled'].includes(delivery.status) && (
    caller.id === delivery.donor_id || isRequester || isVolunteer || caller.role === 'admin'
  )) actions.push('cancel');
  return actions;
}

function mapLocation(row: any): DeliveryLocationDTO {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(row.captured_at).getTime()) / 1000));
  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyM: Number(row.accuracy_m),
    capturedAt: row.captured_at,
    sequence: Number(row.sequence),
    ageSeconds,
    stale: ageSeconds > 60,
  };
}

export async function transitionDelivery(
  deliveryId: string,
  actor: AuthenticatedUser,
  action: DeliveryAction,
  input: DeliveryTransitionRequest,
  idempotencyKey: string | null,
  customClient?: any
): Promise<DeliveryTransitionResponseDTO> {
  const supabase = customClient || getServiceRoleClient();
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new DeliveryWorkflowError('Idempotency-Key is required.', 'IDEMPOTENCY_KEY_REQUIRED', 400);
  }
  const payload: Record<string, any> = {};
  if (input.result !== undefined) payload.result = input.result;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.reason !== undefined) payload.reason = input.reason;
  if (input.evidence !== undefined) payload.evidence = input.evidence;

  const { data, error } = await supabase.rpc('transition_delivery', {
    p_delivery_id: deliveryId,
    p_actor_id: actor.id,
    p_action: action,
    p_payload: payload,
    p_idempotency_key: idempotencyKey,
    p_expected_version: input.rowVersion ?? null,
  });
  if (error || !data) {
    const message = error?.message || '';
    if (message.includes('DELIVERY_NOT_FOUND')) throw new DeliveryWorkflowError('Delivery not found.', 'DELIVERY_NOT_FOUND', 404);
    if (message.includes('STALE_ROW_VERSION') || error?.code === '40001') throw new DeliveryWorkflowError('Delivery changed. Refresh and retry.', 'STALE_ROW_VERSION', 409);
    if (message.includes('IDEMPOTENCY_KEY_REUSED')) throw new DeliveryWorkflowError('Idempotency key was reused for a different command.', 'IDEMPOTENCY_KEY_REUSED', 409);
    if (message.includes('TRANSITION_FORBIDDEN') || error?.code === '42501') throw new DeliveryWorkflowError('This transition is not allowed for the caller or current state.', 'TRANSITION_FORBIDDEN', 403);
    if (message.includes('INVALID_QC_RESULT') || message.includes('CANCELLATION_REASON_REQUIRED')) throw new DeliveryWorkflowError(message, 'INVALID_TRANSITION_INPUT', 400);
    throw new DeliveryWorkflowError(message || 'Delivery transition failed.', 'TRANSITION_FAILED', 500);
  }
  // Dispatch in-app notifications on workflow state transition (idempotent, retry-safe)
  try {
    const { data: deliv } = await supabase
      .from('deliveries')
      .select('donor_id, requester_id, volunteer_id')
      .eq('id', data.delivery_id)
      .maybeSingle();

    if (deliv) {
      if (action === 'arrive_pickup' && deliv.donor_id) {
        await createWorkflowNotification(
          {
            userId: deliv.donor_id,
            title: 'Volunteer at Pickup',
            message: 'The volunteer has arrived to inspect and collect the food.',
            type: 'delivery',
            link: '/dashboard/donor',
            idempotencyKey: `notif-arrive-donor-${data.delivery_id}`,
          },
          supabase
        );
      } else if (action === 'qc') {
        if (input.result === 'pass' && deliv.donor_id) {
          await createWorkflowNotification(
            {
              userId: deliv.donor_id,
              title: 'Quality Check Passed',
              message: 'The volunteer verified the food passed safety inspection.',
              type: 'qc',
              link: '/dashboard/donor',
              idempotencyKey: `notif-qcpass-donor-${data.delivery_id}`,
            },
            supabase
          );
        } else if (input.result === 'fail') {
          if (deliv.donor_id) {
            await createWorkflowNotification(
              {
                userId: deliv.donor_id,
                title: 'Quality Check Failed',
                message: 'The food did not pass inspection and cannot be delivered.',
                type: 'qc',
                link: '/dashboard/donor',
                idempotencyKey: `notif-qcfail-donor-${data.delivery_id}`,
              },
              supabase
            );
          }
          if (deliv.requester_id) {
            await createWorkflowNotification(
              {
                userId: deliv.requester_id,
                title: 'Delivery Cancelled: QC Failed',
                message: 'The food did not pass inspection and the delivery was cancelled.',
                type: 'qc',
                link: '/dashboard/beneficiary',
                idempotencyKey: `notif-qcfail-requester-${data.delivery_id}`,
              },
              supabase
            );
          }
        }
      } else if (action === 'collect' && deliv.requester_id) {
        await createWorkflowNotification(
          {
            userId: deliv.requester_id,
            title: 'Food Collected',
            message: 'The volunteer has collected your food and will begin drop-off shortly.',
            type: 'delivery',
            link: '/dashboard/beneficiary',
            idempotencyKey: `notif-collect-requester-${data.delivery_id}`,
          },
          supabase
        );
      } else if (action === 'start_dropoff' && deliv.requester_id) {
        await createWorkflowNotification(
          {
            userId: deliv.requester_id,
            title: 'Out for Delivery',
            message: 'The volunteer is heading to your delivery location.',
            type: 'delivery',
            link: '/dashboard/beneficiary',
            idempotencyKey: `notif-dropoff-requester-${data.delivery_id}`,
          },
          supabase
        );
      } else if (action === 'handover' && deliv.requester_id) {
        await createWorkflowNotification(
          {
            userId: deliv.requester_id,
            title: 'Food Handed Over',
            message: 'The volunteer has recorded delivery handover. Please confirm receipt in your dashboard.',
            type: 'delivery',
            link: '/dashboard/beneficiary',
            idempotencyKey: `notif-handover-requester-${data.delivery_id}`,
          },
          supabase
        );
      } else if (action === 'confirm_receipt') {
        if (deliv.donor_id) {
          await createWorkflowNotification(
            {
              userId: deliv.donor_id,
              title: 'Delivery Complete',
              message: 'The recipient confirmed receipt of the food. Thank you for your donation!',
              type: 'delivery',
              link: '/dashboard/donor',
              idempotencyKey: `notif-complete-donor-${data.delivery_id}`,
            },
            supabase
          );
        }
        if (deliv.volunteer_id) {
          await createWorkflowNotification(
            {
              userId: deliv.volunteer_id,
              title: 'Delivery Complete',
              message: 'The recipient confirmed receipt. Thank you for your service!',
              type: 'delivery',
              link: '/dashboard/volunteer',
              idempotencyKey: `notif-complete-volunteer-${data.delivery_id}`,
            },
            supabase
          );
        }
      } else if (action === 'cancel') {
        const notifMsg = `Delivery has been cancelled (${input.reason || 'reason not specified'}).`;
        if (deliv.donor_id && deliv.donor_id !== actor.id) {
          await createWorkflowNotification(
            {
              userId: deliv.donor_id,
              title: 'Delivery Cancelled',
              message: notifMsg,
              type: 'delivery',
              link: '/dashboard/donor',
              idempotencyKey: `notif-cancel-donor-${data.delivery_id}`,
            },
            supabase
          );
        }
        if (deliv.requester_id && deliv.requester_id !== actor.id) {
          await createWorkflowNotification(
            {
              userId: deliv.requester_id,
              title: 'Delivery Cancelled',
              message: notifMsg,
              type: 'delivery',
              link: '/dashboard/beneficiary',
              idempotencyKey: `notif-cancel-requester-${data.delivery_id}`,
            },
            supabase
          );
        }
        if (deliv.volunteer_id && deliv.volunteer_id !== actor.id) {
          await createWorkflowNotification(
            {
              userId: deliv.volunteer_id,
              title: 'Delivery Cancelled',
              message: notifMsg,
              type: 'delivery',
              link: '/dashboard/volunteer',
              idempotencyKey: `notif-cancel-volunteer-${data.delivery_id}`,
            },
            supabase
          );
        }
      }
    }
  } catch (_err) {
    // Non-fatal notification error
  }

  return {
    deliveryId: data.delivery_id,
    status: data.status as DeliveryStatus,
    rowVersion: Number(data.row_version),
    replayed: data.replayed === true,
  };
}

export async function recordDeliveryLocation(
  deliveryId: string,
  volunteerId: string,
  input: DeliveryLocationInput,
  customClient?: any
): Promise<DeliveryLocationDTO> {
  const supabase = customClient || getServiceRoleClient();
  const { data, error } = await supabase.rpc('record_delivery_location', {
    p_delivery_id: deliveryId,
    p_volunteer_id: volunteerId,
    p_latitude: input.lat,
    p_longitude: input.lng,
    p_accuracy_m: input.accuracyM,
    p_captured_at: input.capturedAt,
    p_sequence: input.sequence,
  });
  if (error || !data) {
    const message = error?.message || '';
    if (message.includes('DELIVERY_NOT_FOUND')) throw new DeliveryWorkflowError('Delivery not found.', 'DELIVERY_NOT_FOUND', 404);
    if (message.includes('TRACKING_FORBIDDEN') || error?.code === '42501') throw new DeliveryWorkflowError('Location updates are not allowed.', 'TRACKING_FORBIDDEN', 403);
    if (message.includes('LOCATION_RATE_LIMITED')) throw new DeliveryWorkflowError('Location updates are too frequent.', 'LOCATION_RATE_LIMITED', 429);
    throw new DeliveryWorkflowError(message || 'Invalid location update.', 'INVALID_LOCATION', 400);
  }
  return mapLocation(data);
}

export async function getDeliveryTracking(
  deliveryId: string,
  caller: AuthenticatedUser,
  customClient?: any
): Promise<DeliveryLocationDTO | null> {
  const supabase = customClient || getServiceRoleClient();
  await getDeliveryDetail(deliveryId, caller, supabase);
  const { data, error } = await supabase.from('delivery_locations').select('*')
    .eq('delivery_id', deliveryId).order('sequence', { ascending: false }).limit(1);
  if (error) throw new DeliveryWorkflowError('Could not load tracking.', 'TRACKING_FAILED', 500);
  return data?.[0] ? mapLocation(data[0]) : null;
}
