import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { publishListing, ListingWorkflowError } from '@/server/listings';

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
            message: 'You must be signed in to publish a food listing.',
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
            message: 'Only donors can publish food listings.',
          },
        },
        { status: 403 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'DONOR_NOT_VERIFIED',
            message: 'Donor must be phone-verified before publishing food listings.',
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

    // 3. Publish listing
    const published = await publishListing(user.id, listingId, context?.customClient);

    return NextResponse.json(
      {
        data: published,
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

    console.error('Unexpected error in POST /api/listings/[id]/publish:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while publishing the listing.',
        },
      },
      { status: 500 }
    );
  }
}
