/**
 * Route Handler: POST /api/auth/phone/verify
 *
 * Verifies Swift SMS OTP, consumes challenge atomically, resolves or creates
 * Supabase identity, sets authenticated SSR session cookies, and returns
 * destination dashboard route.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPhoneLoginOtp, PhoneAuthError } from "@/server/phoneAuth";
import { SwiftError } from "@/server/swift";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, requestId, otp, purpose } = body;

    if (!phone || !requestId || !otp || !purpose) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Phone, requestId, otp, and purpose are all required",
            code: "VALIDATION_FAILED",
          },
        },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await verifyPhoneLoginOtp({
      phone,
      requestId,
      otp,
      purpose,
      ip,
    });

    return NextResponse.json(
      { data: result, error: null },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof PhoneAuthError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: err.message,
            code: err.code,
            details: err.details,
            retryAfterSeconds: err.retryAfterSeconds,
          },
        },
        { status: err.status }
      );
    }

    if (err instanceof SwiftError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: err.message,
            code: err.code,
            retryAfterSeconds: err.retryAfterSeconds,
          },
        },
        { status: err.status }
      );
    }

    console.error("[POST /api/auth/phone/verify unexpected]", err);
    return NextResponse.json(
      { data: null, error: { message: "Failed to verify code", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
