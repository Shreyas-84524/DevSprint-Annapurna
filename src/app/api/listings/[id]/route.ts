import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { updateListing, ListingWorkflowError } from '@/server/listings';

export async function PATCH(
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
            message: 'You must be signed in to edit a food listing.',
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'donor') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FORBIDDEN_ROLE',
            message: 'Only donors can edit food listings.',
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

    // 3. Parse JSON body
    let body: any;
    try {
      body = await req.json();
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

    // 4. Update listing
    const updated = await updateListing(user.id, listingId, body, context?.customClient);

    return NextResponse.json(
      {
        data: updated,
        error: null,
      },
      { status: 200 }
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

    console.error('Unexpected error in PATCH /api/listings/[id]:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while updating the listing.',
        },
      },
      { status: 500 }
    );
  }
}
