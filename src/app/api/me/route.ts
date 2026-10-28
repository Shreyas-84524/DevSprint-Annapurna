import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getCurrentUserProjection } from '@/server/onboarding';

export async function GET(req: Request) {
  try {
    // 1. Authenticate caller
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to access account details.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Project current user state
    const projection = await getCurrentUserProjection(user.id, user.email || '');

    return NextResponse.json(
      {
        data: projection,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in /api/me route:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching user profile.',
        },
      },
      { status: 500 }
    );
  }
}
