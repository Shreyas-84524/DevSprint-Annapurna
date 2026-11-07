import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { DeliveryWorkflowError } from '@/server/deliveries';
import { getDeliveryRoute } from '@/server/delivery-routing';
import { GeoapifyRoutingError } from '@/server/routing/geoapify';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }, { status: 401 });
    const legParam = new URL(req.url).searchParams.get('leg');
    if (legParam !== 'pickup' && legParam !== 'dropoff') return NextResponse.json({ data: null, error: { code: 'INVALID_LEG', message: 'leg must be pickup or dropoff.' } }, { status: 400 });
    const { id } = await context.params;
    return NextResponse.json({ data: await getDeliveryRoute(id, caller, legParam), error: null });
  } catch (error: any) {
    if (error instanceof DeliveryWorkflowError) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof GeoapifyRoutingError) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    return NextResponse.json({ data: null, error: { code: 'ROUTING_FAILED', message: 'Route calculation failed.' } }, { status: 502 });
  }
}
