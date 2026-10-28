import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 1. Verify bootstrap secret header
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

    // 2. Parse payload
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
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_TARGET_USER_ID',
            message: 'targetUserId (UUID string) is required.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Upsert admin profile in database
    const supabase = await createServerSupabaseClient();
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: targetUserId,
        display_name: body.displayName?.trim() || 'System Administrator',
        role: 'admin',
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Failed to bootstrap admin profile:', upsertError);
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'BOOTSTRAP_DATABASE_ERROR',
            message: 'Failed to record admin privileges in database.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          adminId: targetUserId,
          role: 'admin',
          timestamp: new Date().toISOString(),
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
          message: 'An unexpected error occurred during admin bootstrap.',
        },
      },
      { status: 500 }
    );
  }
}
