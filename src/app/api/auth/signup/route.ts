import { NextResponse } from "next/server";
import { signUpWithPassword, PasswordAuthError } from "@/server/passwordAuth";

export async function POST(req: Request, context?: any) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON request body.",
          },
        },
        { status: 400 }
      );
    }

    const { email, password, role } = body || {};

    const result = await signUpWithPassword(
      { email, password, role },
      context?.customClient
    );

    return NextResponse.json(
      {
        data: result,
        error: null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof PasswordAuthError) {
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

    console.error("Unexpected error in POST /api/auth/signup:", err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during registration.",
        },
      },
      { status: 500 }
    );
  }
}
