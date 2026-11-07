import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import {
  DeliveryWorkflowError,
  transitionDelivery,
} from '@/server/deliveries';
import type { DeliveryAction, DeliveryTransitionRequest } from '@/types/contracts';

export async function handleDeliveryTransition(
  req: Request,
  context: { params: Promise<{ id: string }>; caller?: any; customClient?: any },
  action: DeliveryAction
) {
  try {
    const caller = context?.caller || await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }, { status: 401 });
    const { id } = await context.params;
    const key = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');
    let body: DeliveryTransitionRequest = {};
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
    const data = await transitionDelivery(id, caller, action, body, key, context.customClient);
    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    if (error instanceof SyntaxError) return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } }, { status: 400 });
    if (error instanceof DeliveryWorkflowError) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    console.error(`Unexpected delivery transition error (${action}):`, error);
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Delivery transition failed.' } }, { status: 500 });
  }
}
