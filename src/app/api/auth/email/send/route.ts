/**
 * Route Handler: POST /api/auth/email/send
 *
 * Initiates passwordless email OTP verification via Supabase Auth for Donors, Requesters, or Volunteers.
 * Validates email format, enforces role parameters, dispatches one-time code to user's inbox,
 * and returns standard response envelope.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmailLoginOtp, EmailAuthError } from "@/server/emailAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, purpose } = body;

    if (!email) {
      return NextResponse.json(
        { data: null, error: { message: "Email address is required.", code: "MISSING_EMAIL" } },
        { status: 400 }
      );
    }

    if (!purpose || !["donor_login", "requester_login", "volunteer_login"].includes(purpose)) {
      return NextResponse.json(
        { data: null, error: { message: "Valid login purpose is required.", code: "INVALID_PURPOSE" } },
        { status: 400 }
      );
    }

    const result = await sendEmailLoginOtp({
      email,
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

    console.error("[POST /api/auth/email/send unexpected]", err);
    return NextResponse.json(
      { data: null, error: { message: "Failed to send verification code.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
