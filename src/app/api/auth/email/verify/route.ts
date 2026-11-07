/**
 * Route Handler: POST /api/auth/email/verify
 *
 * Verifies the 6-digit email OTP token via Supabase Auth, establishes a genuine
 * refreshable SSR session cookie, resolves canonical profile and redirect target,
 * and returns the standard response envelope.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyEmailLoginOtp, EmailAuthError } from "@/server/emailAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, token, purpose } = body;

    if (!email || !token || !purpose) {
      return NextResponse.json(
        { data: null, error: { message: "Email, verification code, and purpose are required.", code: "VALIDATION_FAILED" } },
        { status: 400 }
      );
    }

    if (!["donor_login", "requester_login", "volunteer_login"].includes(purpose)) {
      return NextResponse.json(
        { data: null, error: { message: "Valid login purpose is required.", code: "INVALID_PURPOSE" } },
        { status: 400 }
      );
    }

    const result = await verifyEmailLoginOtp({
      email,
      token,
      purpose,
    });

    return NextResponse.json(
      { data: result, error: null },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof EmailAuthError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: err.message,
            code: err.code,
            details: err.details,
          },
        },
        { status: err.status }
      );
    }

    console.error("[POST /api/auth/email/verify unexpected]", err);
    return NextResponse.json(
      { data: null, error: { message: "Failed to verify code.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
