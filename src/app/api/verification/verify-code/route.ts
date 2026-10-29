import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { confirmPhoneVerification } from '@/server/verification';
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
            message: 'You must be signed in to verify your phone number.',
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

    // Accept code or otp (and optional requestId for disambiguation).
    // NEVER accept client-supplied phone number or user ID.
    const code = (body.code || body.otp) as string | undefined;
    const { requestId } = body || {};

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_OTP',
            message: 'Verification code is required and must be a string.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Confirm verification code against server-tracked pending session
    // Authoritatively verifies Swift OTP, marks attempt consumed, records proof, and updates profile.
    const result = await confirmPhoneVerification({
      userId: user.id,
      otp: code,
      requestId: typeof requestId === 'string' ? requestId : undefined,
    });

    return NextResponse.json(
      {
        data: {
          verified: result.verified,
          verifiedAt: result.verifiedAt,
          phone: result.phone,
          proofId: result.proofId,
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

    console.error('Unexpected error in verify-code route:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected internal error occurred while verifying the code.',
        },
      },
      { status: 500 }
    );
  }
}
