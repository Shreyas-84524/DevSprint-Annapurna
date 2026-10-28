import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { createCanonicalProfile, OnboardingError } from '@/server/onboarding';

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to complete onboarding.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
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

    // 3. Create profile
    const result = await createCanonicalProfile(user.id, user.email || '', body);

    return NextResponse.json(
      {
        data: result,
        error: null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof OnboardingError) {
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

    console.error('Unexpected error in onboarding profile route:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during onboarding profile creation.',
        },
      },
      { status: 500 }
    );
  }
}
