/**
 * Server-only Swift Phone OTP Authentication & Identity Bridge
 *
 * Implements mobile OTP sign-in for Donors, Requesters, and Volunteers:
 * - Server-side E.164 normalization & hashing
 * - Database-backed login challenges in internal.phone_login_challenges
 * - Per-phone (5/hr) and per-IP (20/hr) rate limiting and resend cooldowns
 * - Atomic challenge locking to prevent race conditions & replay attacks
 * - Swift SMS OTP verification
 * - Seamless bridge to genuine, refreshable Supabase Auth sessions
 * - Authoritative role preservation from public.profiles
 *
 * Never import or execute this module in client components.
 */

import crypto from "crypto";
import { getServiceRoleClient } from "@/lib/supabase-admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase-server";
import { sendOtp, verifyOtp, normalizeE164Phone, SwiftError } from "@/server/swift";

export { normalizeE164Phone };

export type LoginPurpose = "donor_login" | "requester_login" | "volunteer_login";
export type AllowedRole = "donor" | "requester" | "volunteer";

export interface SendPhoneOtpParams {
  phone: string;
  purpose: LoginPurpose;
  ip?: string;
  idempotencyKey?: string;
}

export interface SendPhoneOtpResult {
  requestId: string;
  resendAfter: number;
  expiresIn: number;
  phoneMasked: string;
  replayed?: boolean;
}

export interface VerifyPhoneOtpParams {
  phone: string;
  requestId: string;
  otp: string;
  purpose: LoginPurpose;
  ip?: string;
}

export interface VerifyPhoneOtpResult {
  user: {
    id: string;
    email?: string;
    phone?: string;
    role: string | null;
  };
  profile: {
    id: string;
    displayName: string;
    role: string;
    phone: string | null;
    isVerified: boolean;
  } | null;
  redirectUrl: string;
  isNewUser: boolean;
  roleMismatch?: boolean;
}

export class PhoneAuthError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;
  public readonly retryAfterSeconds?: number;

  constructor(message: string, code: string, status: number, details?: any, retryAfterSeconds?: number) {
    super(message);
    this.name = "PhoneAuthError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function maskPhone(normalizedPhone: string): string {
  if (normalizedPhone.length < 8) return normalizedPhone;
  const prefix = normalizedPhone.slice(0, 3);
  const suffix = normalizedPhone.slice(-4);
  const masked = "*".repeat(normalizedPhone.length - 7);
  return `${prefix}${masked}${suffix}`;
}

function purposeToRole(purpose: LoginPurpose): AllowedRole {
  switch (purpose) {
    case "donor_login":
      return "donor";
    case "requester_login":
      return "requester";
    case "volunteer_login":
      return "volunteer";
    default:
      throw new PhoneAuthError("Invalid login purpose", "INVALID_PURPOSE", 400);
  }
}

/**
 * Initiates phone OTP sign-in by checking rate limits, sending OTP via Swift,
 * and saving a single-use challenge in internal.phone_login_challenges.
 */
export async function sendPhoneLoginOtp(params: SendPhoneOtpParams): Promise<SendPhoneOtpResult> {
  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeE164Phone(params.phone);
  } catch (err: any) {
    if (err instanceof SwiftError) {
      throw new PhoneAuthError(err.message, err.code, err.status);
    }
    throw err;
  }

  const requestedRole = purposeToRole(params.purpose);
  const phoneHash = sha256(normalizedPhone);
  const ipHash = sha256(params.ip || "127.0.0.1");

  const supabaseAdmin = getServiceRoleClient();

  // 1. Send OTP through Swift first (bounded retry & error handling inside swift.ts)
  let swiftSend;
  try {
    swiftSend = await sendOtp(normalizedPhone, params.idempotencyKey || crypto.randomUUID());
  } catch (err: any) {
    if (err instanceof SwiftError) {
      if (err.status === 429) {
        throw new PhoneAuthError(
          "Too many verification attempts. Please wait before requesting another code.",
          "RATE_LIMITED",
          429,
          null,
          err.retryAfterSeconds || 60
        );
      }
      throw new PhoneAuthError(err.message, err.code, err.status);
    }
    throw new PhoneAuthError("SMS verification service is temporarily unavailable", "SWIFT_UNAVAILABLE", 503);
  }

  // 2. Record challenge and enforce database rate limits / cooldowns
  const { data: recordData, error: dbErr } = await supabaseAdmin.rpc("record_phone_login_send", {
    p_phone_hash: phoneHash,
    p_phone_normalized: normalizedPhone,
    p_request_id: swiftSend.requestId,
    p_idempotency_key: params.idempotencyKey || null,
    p_purpose: params.purpose,
    p_requested_role: requestedRole,
    p_ip_hash: ipHash,
    p_expires_in_seconds: swiftSend.expiresIn || 600,
    p_resend_after_seconds: swiftSend.resendAfter || 30,
  });

  if (dbErr) {
    if (dbErr.code === "P0001") {
      throw new PhoneAuthError("Too many login requests. Please try again later.", "RATE_LIMITED", 429, null, 3600);
    }
    if (dbErr.code === "P0002") {
      throw new PhoneAuthError("Please wait before requesting a new code.", "COOLDOWN_ACTIVE", 429, null, 30);
    }
    console.error("[phoneAuth] Error recording challenge:", dbErr);
    throw new PhoneAuthError("Failed to initiate login challenge", "DATABASE_ERROR", 500);
  }

  const row = Array.isArray(recordData) ? recordData[0] : recordData;

  return {
    requestId: row?.request_id || swiftSend.requestId,
    resendAfter: swiftSend.resendAfter || 30,
    expiresIn: swiftSend.expiresIn || 600,
    phoneMasked: maskPhone(normalizedPhone),
    replayed: row?.replayed ?? false,
  };
}

/**
 * Verifies the Swift OTP, marks challenge consumed, resolves/creates the Supabase Auth user,
 * preserves canonical roles, and establishes a genuine refreshable Supabase SSR session.
 */
export async function verifyPhoneLoginOtp(params: VerifyPhoneOtpParams): Promise<VerifyPhoneOtpResult> {
  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeE164Phone(params.phone);
  } catch (err: any) {
    if (err instanceof SwiftError) {
      throw new PhoneAuthError(err.message, err.code, err.status);
    }
    throw err;
  }
  const purpose = params.purpose;
  purposeToRole(purpose); // Asserts valid purpose

  const trimmedOtp = (params.otp || "").trim();
  if (!trimmedOtp || !/^\d{4,8}$/.test(trimmedOtp)) {
    throw new PhoneAuthError("A valid 4-8 digit verification code is required.", "INVALID_CODE_FORMAT", 400);
  }

  if (!params.requestId) {
    throw new PhoneAuthError("Request ID is required.", "MISSING_REQUEST_ID", 400);
  }

  const phoneHash = sha256(normalizedPhone);
  const supabaseAdmin = getServiceRoleClient();

  // 1. Claim challenge atomically (locks row, validates expiry, increments attempts)
  const { data: claimData, error: claimErr } = await supabaseAdmin.rpc("claim_phone_login_challenge", {
    p_phone_hash: phoneHash,
    p_request_id: params.requestId,
    p_purpose: purpose,
  });

  if (claimErr) {
    if (claimErr.code === "P0003") {
      throw new PhoneAuthError("Login challenge not found or mismatched.", "CHALLENGE_NOT_FOUND", 404);
    }
    if (claimErr.code === "P0004") {
      throw new PhoneAuthError("This verification code has already been used.", "CHALLENGE_ALREADY_USED", 409);
    }
    if (claimErr.code === "P0005") {
      throw new PhoneAuthError("Verification code has expired. Please request a new one.", "CHALLENGE_EXPIRED", 410);
    }
    if (claimErr.code === "P0006") {
      throw new PhoneAuthError("Maximum verification attempts exceeded. Please request a new code.", "MAX_ATTEMPTS_EXCEEDED", 429);
    }
    console.error("[phoneAuth] Challenge claim error:", claimErr);
    throw new PhoneAuthError("Unable to verify challenge", "DATABASE_ERROR", 500);
  }

  const challenge = Array.isArray(claimData) ? claimData[0] : claimData;
  const challengeId = challenge?.challenge_id;

  // 2. Verify with Swift service
  try {
    const swiftVerify = await verifyOtp({
      phone: normalizedPhone,
      requestId: params.requestId,
      otp: trimmedOtp,
    });

    if (!swiftVerify.verified) {
      throw new PhoneAuthError("Invalid verification code. Please check and try again.", "INVALID_OTP", 400);
    }
  } catch (err: any) {
    if (err instanceof SwiftError) {
      throw new PhoneAuthError(err.message, err.code, err.status, {
        attemptsRemaining: err.attemptsRemaining,
      });
    }
    if (err instanceof PhoneAuthError) throw err;
    console.error("[phoneAuth] Swift verify error:", err);
    throw new PhoneAuthError("Verification service temporarily unavailable", "SWIFT_UNAVAILABLE", 503);
  }

  // 3. Mark challenge consumed upon successful Swift verification
  await supabaseAdmin.rpc("consume_phone_login_challenge", {
    p_challenge_id: challengeId,
  });

  // 4. Resolve or create Supabase user and link profile
  const deterministicEmail = `phone_${normalizedPhone.replace(/\+/g, "")}@auth.annapurna.internal`;

  // Check if profile exists with this normalized phone
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, display_name, phone, is_verified")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  let targetUserId: string;
  let targetEmail: string = deterministicEmail;
  let isNewUser = false;
  let roleMismatch = false;
  const finalProfile = existingProfile;

  if (existingProfile) {
    // Existing user: preserve canonical role strictly
    targetUserId = existingProfile.id;

    // Check if purpose requested matches their existing stored role
    const requestedRole = purposeToRole(purpose);
    if (existingProfile.role !== requestedRole && existingProfile.role !== "admin") {
      roleMismatch = true;
    }

    // Resolve user's actual email from auth.users
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (authUserData?.user?.email) {
      targetEmail = authUserData.user.email;
    }
  } else {
    // New user: find or create in auth.users
    isNewUser = true;
    const requestedRole = purposeToRole(purpose);

    // Try to create the auth user
    const { data: createdAuth, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: deterministicEmail,
      phone: normalizedPhone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        role: requestedRole,
        phone: normalizedPhone,
      },
    });

    if (createAuthErr) {
      // If user already existed in auth.users, fetch by listing or email
      if (createAuthErr.message.includes("already exists")) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const found = userList?.users?.find(
          (u) => u.email === deterministicEmail || u.phone === normalizedPhone
        );
        if (!found) {
          throw new PhoneAuthError("Failed to resolve authentication record", "AUTH_CREATE_FAILED", 500);
        }
        targetUserId = found.id;
        targetEmail = found.email || deterministicEmail;
      } else {
        console.error("[phoneAuth] Auth create user error:", createAuthErr);
        throw new PhoneAuthError("Failed to initialize user identity", "AUTH_CREATE_FAILED", 500);
      }
    } else {
      targetUserId = createdAuth.user.id;
      targetEmail = createdAuth.user.email || deterministicEmail;
    }

    // Record verified proof in public.verification_records
    await supabaseAdmin
      .from("verification_records")
      .upsert(
        {
          user_id: targetUserId,
          phone: normalizedPhone,
          proof_id: `swift_${challengeId || params.requestId}`,
          status: "verified",
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  }

  // 5. Generate single-use magiclink token_hash for the authoritative user
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("[phoneAuth] Generate magic link error:", linkErr);
    throw new PhoneAuthError("Failed to generate secure session bridge token", "SESSION_BRIDGE_FAILED", 500);
  }

  // 6. Establish genuine Supabase SSR session via verifyOtp
  const serverClient = await createServerSupabaseClient();
  const { data: sessionData, error: sessionErr } = await serverClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionErr || !sessionData?.session) {
    console.error("[phoneAuth] Session verifyOtp error:", sessionErr);
    throw new PhoneAuthError("Failed to establish authenticated session", "SESSION_ESTABLISH_FAILED", 500);
  }

  // 7. Calculate destination redirect route
  let redirectUrl = "/onboarding";

  if (finalProfile) {
    // Check if onboarding is complete (has default location)
    const { data: loc } = await supabaseAdmin
      .from("saved_locations")
      .select("id")
      .eq("user_id", finalProfile.id)
      .eq("is_default", true)
      .maybeSingle();

    const isComplete = !!finalProfile.display_name && (finalProfile.role === "admin" || !!loc);

    if (isComplete) {
      switch (finalProfile.role) {
        case "donor":
          redirectUrl = "/dashboard/donor";
          break;
        case "requester":
          redirectUrl = "/dashboard/beneficiary";
          break;
        case "volunteer":
          redirectUrl = "/dashboard/volunteer";
          break;
        case "admin":
          redirectUrl = "/admin";
          break;
        default:
          redirectUrl = "/onboarding";
      }
    } else {
      redirectUrl = "/onboarding";
    }
  }

  return {
    user: {
      id: targetUserId,
      email: targetEmail,
      phone: normalizedPhone,
      role: finalProfile?.role || null,
    },
    profile: finalProfile
      ? {
          id: finalProfile.id,
          displayName: finalProfile.display_name,
          role: finalProfile.role,
          phone: finalProfile.phone,
          isVerified: finalProfile.is_verified,
        }
      : null,
    redirectUrl,
    isNewUser,
    roleMismatch,
  };
}
