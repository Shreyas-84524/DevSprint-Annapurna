import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { acceptDeliveryTask, DeliveryWorkflowError } from '@/server/deliveries';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }>; caller?: AuthenticatedUser; customClient?: any }
) {
  try {
    // 1. Authenticate caller
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to accept a delivery task.',
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'volunteer') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED_VOLUNTEER',
            message: 'Only volunteers can accept delivery tasks.',
          },
        },
        { status: 403 }
      );
    }

    // 2. Resolve delivery ID
    const { id: deliveryId } = await context.params;
    if (!deliveryId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_ID',
            message: 'Delivery ID is required.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Extract Idempotency Key header
    const idempotencyKey =
      req.headers.get('Idempotency-Key') ||
      req.headers.get('idempotency-key') ||
      undefined;

    // 4. Accept delivery task
    const result = await acceptDeliveryTask(deliveryId, user.id, idempotencyKey, context?.customClient);

    return NextResponse.json(
      {
        data: result,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof DeliveryWorkflowError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.status }
      );
    }

    console.error('Unexpected error in POST /api/deliveries/[id]/accept:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while accepting the delivery task.',
        },
      },
      { status: 500 }
    );
  }
}
