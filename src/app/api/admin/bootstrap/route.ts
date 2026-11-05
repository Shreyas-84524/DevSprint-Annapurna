import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceRoleClient } from '@/lib/supabase-admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    // 1. Verify bootstrap secret configuration
    const serverBootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!serverBootstrapSecret || serverBootstrapSecret.length < 16) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'BOOTSTRAP_NOT_CONFIGURED',
            message: 'Admin bootstrap is not configured or secret is invalid on this server.',
          },
        },
        { status: 503 }
      );
    }

    const providedSecret = req.headers.get('x-admin-bootstrap-secret');
    if (!providedSecret) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing admin bootstrap authorization header.',
          },
        },
        { status: 401 }
      );
    }

    // Timing-safe secret comparison
    const expectedBuffer = Buffer.from(serverBootstrapSecret);
    const providedBuffer = Buffer.from(providedSecret);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Invalid admin bootstrap secret provided.',
          },
        },
        { status: 403 }
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

    const { targetUserId } = body || {};
    if (!targetUserId || typeof targetUserId !== 'string' || !UUID_REGEX.test(targetUserId)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_TARGET_USER_ID',
            message: 'targetUserId must be a valid RFC 4122 UUID string.',
          },
        },
        { status: 400 }
      );
    }

    const displayName = typeof body.displayName === 'string'
      ? body.displayName.trim()
      : 'System Administrator';

    if (displayName.length < 2 || displayName.length > 100) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_DISPLAY_NAME',
            message: 'displayName must be between 2 and 100 characters.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Require the privileged server-only client.
    let supabase;
    try {
      supabase = getServiceRoleClient();
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'PRIVILEGED_DATABASE_NOT_CONFIGURED',
            message: 'Administrative bootstrap is unavailable on this server.',
          },
        },
        { status: 503 }
      );
    }

    // 4. The database function serializes concurrent first-admin attempts.
    const { error: rpcError } = await supabase.rpc('bootstrap_admin_user', {
      p_target_user_id: targetUserId,
      p_display_name: displayName,
    });

    if (rpcError) {
      if (rpcError.message?.includes('ADMIN_ALREADY_EXISTS')) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: 'ADMIN_ALREADY_EXISTS',
              message: 'An administrator account already exists. Repeat bootstrap execution is prohibited.',
            },
          },
          { status: 409 }
        );
      }

      if (rpcError.message?.includes('USER_NOT_FOUND')) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'Target user does not exist in authentication records.',
            },
          },
          { status: 404 }
        );
      }

      console.error('Failed to bootstrap admin user:', rpcError);
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'BOOTSTRAP_FAILED',
            message: 'Failed to initialize administrative account.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          userId: targetUserId,
          role: 'admin',
          verified: true,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in admin bootstrap route:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected internal error occurred during admin bootstrap.',
        },
      },
      { status: 500 }
    );
  }
}
