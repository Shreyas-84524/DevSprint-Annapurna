import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';

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

    // 3. Resolve privileged client
    let supabase: any;
    try {
      supabase = getServiceRoleClient();
    } catch {
      supabase = await createServerSupabaseClient();
    }

    // 4. One-time lockout check: Verify whether an admin profile already exists
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (!adminCheckError && existingAdmin) {
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

    // 5. Execute privileged admin bootstrap
    const secretHash = crypto.createHash('sha256').update(serverBootstrapSecret).digest('hex');

    // Attempt RPC first
    const { error: rpcError } = await supabase.rpc('bootstrap_admin_user', {
      target_user_id: targetUserId,
      bootstrap_secret: providedSecret,
      expected_secret_hash: secretHash,
    });

    if (rpcError) {
      if (rpcError.message?.includes('already exists')) {
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

      if (rpcError.message?.includes('not found in auth')) {
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

      // If RPC fails due to RLS/function permissions, attempt direct service-role upsert
      const { error: directUpsertError } = await supabase
        .from('profiles')
        .upsert({
          id: targetUserId,
          display_name: body.displayName?.trim() || 'System Administrator',
          role: 'admin',
          is_verified: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (directUpsertError) {
        console.error('Failed to bootstrap admin user:', directUpsertError);
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
