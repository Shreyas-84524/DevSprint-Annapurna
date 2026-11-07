import { getServiceRoleClient } from '@/lib/supabase-admin';
import { getDeliveryDetail, DeliveryWorkflowError } from '@/server/deliveries';
import { getCalculatedRoute } from '@/server/routing';
import type { AuthenticatedUser } from '@/server/auth';
import type { DeliveryRouteDTO } from '@/types/contracts';

export async function getDeliveryRoute(
  deliveryId: string,
  caller: AuthenticatedUser,
  leg: 'pickup' | 'dropoff'
): Promise<DeliveryRouteDTO> {
  const supabase = getServiceRoleClient();
  const detail = await getDeliveryDetail(deliveryId, caller);
  const { data: cached } = await supabase.from('delivery_route_cache').select('*')
    .eq('delivery_id', deliveryId).eq('leg', leg).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (cached?.route) {
    return { ...cached.route, deliveryId, leg, cached: true, providerTimestamp: cached.updated_at };
  }

  const latest = detail.latestLocation;
  const pickup = detail.pickupLocation;
  const dropoff = detail.dropoffLocation;
  if (!pickup || !dropoff) throw new DeliveryWorkflowError('Delivery coordinates are unavailable.', 'ROUTE_COORDINATES_MISSING', 409);
  if (leg === 'pickup' && !latest) throw new DeliveryWorkflowError('Volunteer location is required for the pickup route.', 'VOLUNTEER_LOCATION_MISSING', 409);

  const origin = leg === 'pickup'
    ? { lat: latest!.latitude, lng: latest!.longitude }
    : latest
      ? { lat: latest.latitude, lng: latest.longitude }
      : { lat: pickup.latitude, lng: pickup.longitude };
  const destination = leg === 'pickup'
    ? { lat: pickup.latitude, lng: pickup.longitude }
    : { lat: dropoff.latitude, lng: dropoff.longitude };
  const route = await getCalculatedRoute(origin, destination);
  const providerTimestamp = new Date().toISOString();
  const response: DeliveryRouteDTO = {
    ...route,
    deliveryId,
    leg,
    cached: false,
    providerTimestamp,
  };
  await supabase.from('delivery_route_cache').upsert({
    delivery_id: deliveryId,
    leg,
    provider: 'geoapify',
    route: response,
    origin_latitude: origin.lat,
    origin_longitude: origin.lng,
    destination_latitude: destination.lat,
    destination_longitude: destination.lng,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    updated_at: providerTimestamp,
  }, { onConflict: 'delivery_id,leg' });
  return response;
}
