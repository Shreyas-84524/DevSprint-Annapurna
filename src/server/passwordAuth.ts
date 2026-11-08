/**
 * Server-only Email & Password Authentication Service
 *
 * Implements secure Supabase email/password authentication:
 * - Public role signup (restricted to donor, requester, volunteer)
 * - Password login with SSR cookie establishment
 * - Canonical profile resolution & admin protection
 * - Password reset and update flows
 *
 * Invariants:
 * 1. Plaintext passwords are never logged, stored, or exposed.
 * 2. Admin cannot be created or granted through public signup.
 * 3. Canonical roles are determined exclusively by public.profiles.
 * 4. Error messages for authentication never disclose account existence.
 */

import { createClient as createServerSupabaseClient } from "@/lib/supabase-server";
import {
  SignupRequest,
  SignupResponseData,
  LoginRequest,
  LoginResponseData,
  ForgotPasswordRequest,
  ForgotPasswordResponseData,
  UpdatePasswordResponseData,
  UserRole,
  OnboardingRole,
  ONBOARDING_ROLES,
} from "@/types/contracts";

export class PasswordAuthError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    code: string,
    status: number,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "PasswordAuthError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Normalizes email address by trimming whitespace and lowercasing.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new PasswordAuthError("Email address is required.", "MISSING_EMAIL", 400);
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new PasswordAuthError("Please enter a valid email address.", "INVALID_EMAIL_FORMAT", 400);
  }

  return trimmed;
}

/**
 * Enforces minimum password complexity requirements.
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== "string") {
    throw new PasswordAuthError("Password is required.", "MISSING_PASSWORD", 400);
  }

  if (password.length < 8) {
    throw new PasswordAuthError(
      "Password must be at least 8 characters long.",
      "WEAK_PASSWORD",
      400
    );
  }
}

/**
 * Validates public signup role (donor, requester, volunteer).
 */
export function validateSignupRole(role: string): OnboardingRole {
  if (!role || typeof role !== "string") {
    throw new PasswordAuthError("Role is required.", "MISSING_ROLE", 400);
  }

  if (role === "admin") {
    throw new PasswordAuthError(
      "The admin role cannot be self-assigned through public registration.",
      "INVALID_ROLE",
      400
    );
  }

  if (!ONBOARDING_ROLES.includes(role as OnboardingRole)) {
    throw new PasswordAuthError(
      `Invalid role '${role}'. Allowed roles: ${ONBOARDING_ROLES.join(", ")}.`,
      "INVALID_ROLE",
      400
    );
  }

  return role as OnboardingRole;
}

/**
 * Public Email/Password Registration
 */
export async function signUpWithPassword(
  input: SignupRequest,
  customClient?: any
): Promise<SignupResponseData> {
  const normalizedEmail = normalizeEmail(input.email);
  validatePassword(input.password);
  validateSignupRole(input.role);

  const serverClient = customClient || (await createServerSupabaseClient());

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://annapurna-steel.vercel.app"
  ).replace(/\/+$/, "");

  // Note: user_metadata is intentionally omitted or neutral.
  // The authoritative canonical role is strictly recorded in public.profiles during onboarding.
  const { data: authData, error: authError } = await serverClient.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?role=${input.role}`,
    },
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("rate limit")) {
      throw new PasswordAuthError(
        "Too many signup attempts. Please try again later.",
        "RATE_LIMITED",
        429,
        60
      );
    }

    if (authError.message?.toLowerCase().includes("already registered")) {
      throw new PasswordAuthError(
        "An account with this email already exists. Please sign in instead.",
        "USER_ALREADY_EXISTS",
        409
      );
    }

    throw new PasswordAuthError(
      authError.message || "Unable to register account. Please try again.",
      "SIGNUP_FAILED",
      400
    );
  }

  const user = authData.user;
  if (!user) {
    throw new PasswordAuthError("Account creation failed. Please try again.", "SIGNUP_FAILED", 500);
  }

  const hasSession = !!authData.session;
  const emailConfirmationRequired = !hasSession && (!user.identities || user.identities.length === 0 || !user.confirmed_at);

  return {
    user: {
      id: user.id,
      email: user.email || normalizedEmail,
    },
    session: hasSession,
    emailConfirmationRequired,
    redirectUrl: "/onboarding",
  };
}

/**
 * Public & Admin Email/Password Sign In
 */
export async function signInWithPassword(
  input: LoginRequest,
  customClient?: any
): Promise<LoginResponseData> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!input.password || typeof input.password !== "string") {
    throw new PasswordAuthError("Password is required.", "MISSING_PASSWORD", 400);
  }

  const serverClient = customClient || (await createServerSupabaseClient());

  const { data: authData, error: authError } = await serverClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: input.password,
  });

  if (authError || !authData?.user) {
    if (authError?.message?.toLowerCase().includes("rate limit")) {
      throw new PasswordAuthError(
        "Too many login attempts. Please try again later.",
        "RATE_LIMITED",
        429,
        60
      );
    }

    // Generic invalid credentials message that does not disclose whether the email exists
    throw new PasswordAuthError(
      "Invalid email or password.",
      "INVALID_CREDENTIALS",
      401
    );
  }

  const user = authData.user;

  // Resolve authoritative profile from public.profiles
  const { data: profile } = await serverClient
    .from("profiles")
    .select("id, role, is_verified, display_name")
    .eq("id", user.id)
    .maybeSingle();

  // If user signed in at /login/admin, strictly verify they hold the canonical admin role
  if (input.portalRole === "admin") {
    if (!profile || profile.role !== "admin") {
      // Disallow non-admin from admin portal: immediately terminate the session
      try {
        await serverClient.auth.signOut();
      } catch {
        // Safe fallback
      }
      throw new PasswordAuthError(
        "Invalid administrator credentials or unauthorized account.",
        "UNAUTHORIZED_ROLE",
        403
      );
    }
  }

  // Calculate redirect destination based on authoritative profile
  let redirectUrl = "/onboarding";
  let roleMismatch = false;

  if (profile) {
    const canonicalRole = profile.role as UserRole;

    if (input.portalRole && input.portalRole !== canonicalRole && canonicalRole !== "admin") {
      roleMismatch = true;
    }

    if (canonicalRole === "admin") {
      redirectUrl = "/admin";
    } else if (canonicalRole === "volunteer") {
      redirectUrl = "/dashboard/volunteer";
    } else if (canonicalRole === "donor") {
      redirectUrl = "/dashboard/donor";
    } else if (canonicalRole === "requester") {
      redirectUrl = "/dashboard/beneficiary";
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email || normalizedEmail,
    },
    profile: profile
      ? {
          id: profile.id,
          role: profile.role as UserRole,
          isVerified: profile.is_verified,
          displayName: profile.display_name,
        }
      : null,
    redirectUrl,
    roleMismatch,
    canonicalRole: profile?.role as UserRole | undefined,
  };
}

/**
 * Request Password Reset Email (Forgot Password)
 */
export async function requestPasswordReset(
  input: ForgotPasswordRequest,
  customClient?: any
): Promise<ForgotPasswordResponseData> {
  const normalizedEmail = normalizeEmail(input.email);

  const serverClient = customClient || (await createServerSupabaseClient());

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://annapurna-steel.vercel.app"
  ).replace(/\/+$/, "");
  const redirectTo = `${appUrl}/reset-password`;

  try {
    await serverClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("rate limit")) {
      throw new PasswordAuthError(
        "Too many password reset requests. Please wait a few minutes.",
        "RATE_LIMITED",
        429,
        60
      );
    }
    // Suppress internal error details to maintain neutral response
  }

  // Always return neutral response so email existence is never disclosed
  return {
    message: "If an account exists for this email, password reset instructions have been sent.",
  };
}

/**
 * Update Password for an Authenticated Recovery Session
 */
export async function updatePassword(
  newPassword: string,
  customClient?: any
): Promise<UpdatePasswordResponseData> {
  validatePassword(newPassword);

  const serverClient = customClient || (await createServerSupabaseClient());

  const { data: userData, error: userError } = await serverClient.auth.getUser();
  if (userError || !userData?.user) {
    throw new PasswordAuthError(
      "Your password reset link is invalid or expired. Please request a new one.",
      "UNAUTHORIZED",
      401
    );
  }

  const { error: updateError } = await serverClient.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new PasswordAuthError(
      updateError.message || "Failed to update password. Please try again.",
      "UPDATE_FAILED",
      400
    );
  }

  return {
    success: true,
    redirectUrl: "/login",
  };
}
