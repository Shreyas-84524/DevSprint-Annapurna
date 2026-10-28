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
    const result = await confirmPhoneVerification({
      userId: user.id,
      otp: code,
      requestId: typeof requestId === 'string' ? requestId : undefined,
    });

    // 4. Update profile in database if possible
    try {
      const { createClient: createServerSupabaseClient } = await import('@/lib/supabase-server');
      const supabase = await createServerSupabaseClient();
      await supabase
        .from('profiles')
        .update({
          is_verified: true,
          phone: result.phone,
          verified_at: result.verifiedAt,
        })
        .eq('id', user.id);

      await supabase
        .from('verification_records')
        .upsert({
          user_id: user.id,
          phone: result.phone,
          proof_id: result.phone,
          status: 'verified',
          verified_at: result.verifiedAt,
        });
    } catch (dbErr) {
      // In-memory verification already succeeded; database error logged non-fatally
      console.error('Non-fatal error updating profile verification in DB:', dbErr);
    }

    return NextResponse.json(
      {
        data: {
          verified: result.verified,
          verifiedAt: result.verifiedAt,
          phone: result.phone,
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
            attemptsRemaining: err.attemptsRemaining,
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
          message: 'An unexpected error occurred during code verification.',
        },
      },
      { status: 500 }
    );
  }
}
