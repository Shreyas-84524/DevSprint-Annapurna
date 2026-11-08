import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { claimListing, ListingWorkflowError } from '@/server/listings';

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
            message: 'You must be signed in to claim a food listing.',
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'requester') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED_REQUESTER',
            message: 'Only community requesters can claim food listings.',
          },
        },
        { status: 403 }
      );
    }

    // 2. Resolve listing ID
    const { id: listingId } = await context.params;
    if (!listingId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_ID',
            message: 'Listing ID is required.',
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

    // 4. Parse request body (optional deliveryLocationId)
    let body: any = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON request body.',
          },
        },
        { status: 400 }
      );
    }

    // 5. Execute atomic claim
    const result = await claimListing(listingId, user.id, body, idempotencyKey, context?.customClient);

    const statusCode = result.replayed ? 200 : 201;

    return NextResponse.json(
      {
        data: result,
        error: null,
      },
      { status: statusCode }
    );
  } catch (err: any) {
    if (err instanceof ListingWorkflowError) {
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

    console.error('Unexpected error in POST /api/listings/[id]/claim:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while claiming the food listing.',
        },
      },
      { status: 500 }
    );
  }
}
