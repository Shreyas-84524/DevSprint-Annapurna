import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { initiatePhoneVerification } from '@/server/verification';
import { SwiftError } from '@/server/swift';

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
            message: 'You must be signed in to request phone verification.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse request payload
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

    const { phone } = body || {};
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_PHONE',
            message: 'Phone number is required.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Check client-provided idempotency key (if retrying an identical attempt)
    const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;

    // 4. Initiate verification send via Swift
    const result = await initiatePhoneVerification({
      userId: user.id,
      phone,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        data: {
          requestId: result.requestId,
          expiresIn: result.expiresIn,
          resendAfter: result.resendAfter,
          status: result.status, // 'QUEUED'
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof SwiftError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
            retryAfterSeconds: err.retryAfterSeconds,
          },
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected verification error occurred.',
        },
      },
      { status: 500 }
    );
  }
}
