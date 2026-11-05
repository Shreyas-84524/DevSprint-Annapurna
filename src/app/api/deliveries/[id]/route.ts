import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getDeliveryDetail, DeliveryWorkflowError } from '@/server/deliveries';

export async function GET(
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
            message: 'You must be signed in to view delivery details.',
          },
        },
        { status: 401 }
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

    // 3. Retrieve delivery detail with participant projection
    const delivery = await getDeliveryDetail(deliveryId, user, context?.customClient);

    return NextResponse.json(
      {
        data: delivery,
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

    console.error('Unexpected error in GET /api/deliveries/[id]:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching delivery details.',
        },
      },
      { status: 500 }
    );
  }
}
