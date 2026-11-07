import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { createListing, ListingWorkflowError } from '@/server/listings';

export async function POST(
  req: Request,
  context?: any
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
            message: 'You must be signed in to create a food listing.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Enforce donor role & verification
    if (user.role !== 'donor') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FORBIDDEN_ROLE',
            message: 'Only donors can create food listings.',
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
            message: 'Donor must be phone-verified before creating food listings.',
          },
        },
        { status: 403 }
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

    // 4. Create listing
    const listing = await createListing(user.id, body, context?.customClient);

    return NextResponse.json(
      {
        data: listing,
        error: null,
      },
      { status: 201 }
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

    console.error('Unexpected error in POST /api/listings:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while creating the listing.',
        },
      },
      { status: 500 }
    );
  }
}
