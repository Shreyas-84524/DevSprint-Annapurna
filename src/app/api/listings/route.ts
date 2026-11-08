import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { createListing, getDonorListings, ListingWorkflowError } from '@/server/listings';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('mine') !== 'true') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MINE_REQUIRED',
            message: 'Use mine=true to request the signed-in donor listings.',
          },
        },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const user = context && 'caller' in context
      ? context.caller
      : await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view donor listings.',
          },
        },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    if (user.role !== 'donor') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FORBIDDEN_ROLE',
            message: 'Only donors can view donor-owned listings.',
          },
        },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const listings = await getDonorListings(user.id, context?.customClient);
    return NextResponse.json(
      { data: listings, error: null },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err: any) {
    if (err instanceof ListingWorkflowError) {
      return NextResponse.json(
        {
          data: null,
          error: { code: err.code, message: err.message },
        },
        { status: err.status, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    console.error('Unexpected error in GET /api/listings:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'LISTINGS_FETCH_FAILED',
          message: 'An unexpected error occurred while loading donor listings.',
        },
      },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

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

    // 2. Enforce canonical donor role
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
