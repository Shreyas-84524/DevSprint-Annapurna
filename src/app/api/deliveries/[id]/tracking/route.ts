import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { DeliveryWorkflowError, getDeliveryTracking } from '@/server/deliveries';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }, { status: 401 });
    const { id } = await context.params;
    return NextResponse.json({ data: await getDeliveryTracking(id, caller), error: null });
  } catch (error: any) {
    if (error instanceof DeliveryWorkflowError) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Tracking lookup failed.' } }, { status: 500 });
  }
}
