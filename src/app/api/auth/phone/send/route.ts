/**
 * Route Handler: POST /api/auth/phone/send
 *
 * Initiates phone OTP sign-in for Donors, Requesters, or Volunteers.
 * Validates E.164 phone format, enforces database-backed rate limiting,
 * dispatches SMS through Swift, and returns a single-use requestId.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendPhoneLoginOtp, PhoneAuthError } from "@/server/phoneAuth";
import { SwiftError } from "@/server/swift";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, purpose, idempotencyKey } = body;

    if (!phone) {
      return NextResponse.json(
        { data: null, error: { message: "Phone number is required", code: "MISSING_PHONE" } },
        { status: 400 }
      );
    }

    if (!purpose || !["donor_login", "requester_login", "volunteer_login"].includes(purpose)) {
      return NextResponse.json(
        { data: null, error: { message: "Valid login purpose is required", code: "INVALID_PURPOSE" } },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await sendPhoneLoginOtp({
      phone,
      purpose,
      ip,
      idempotencyKey,
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

    console.error("[POST /api/auth/phone/send unexpected]", err);
    return NextResponse.json(
      { data: null, error: { message: "Failed to send verification code", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
