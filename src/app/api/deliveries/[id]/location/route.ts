import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { DeliveryWorkflowError, recordDeliveryLocation } from '@/server/deliveries';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }, { status: 401 });
    if (caller.role !== 'volunteer') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN_ROLE', message: 'Volunteer role required.' } }, { status: 403 });
    const { id } = await context.params;
    const body = await req.json();
    const data = await recordDeliveryLocation(id, caller.id, body);
    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    if (error instanceof DeliveryWorkflowError) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    return NextResponse.json({ data: null, error: { code: 'INVALID_LOCATION', message: 'Invalid location payload.' } }, { status: 400 });
  }
}
