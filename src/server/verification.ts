/**
 * Server-only phone verification service.
 *
 * Production calls require the privileged Supabase client. Tests may inject an
 * explicit RPC-compatible client, but configuration failures never select a
 * process-local store.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import { normalizeE164Phone, sendOtp, SwiftError, verifyOtp } from './swift';

export interface VerificationRecord {
  userId: string;
  phone: string;
  proofId: string;
  status: 'verified' | 'revoked';
  verifiedAt: string;
}

export interface IVerificationClient {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{
    data: any;
    error: { message?: string; code?: string } | null;
  }>;
  from: (table: string) => any;
}

export type VerificationClient = IVerificationClient;

function resolveVerificationClient(customClient?: VerificationClient): VerificationClient {
  if (customClient) return customClient;

  try {
    return getServiceRoleClient() as unknown as VerificationClient;
  } catch {
    throw new SwiftError('Phone verification is temporarily unavailable.', {
      code: 'VERIFICATION_STORE_UNAVAILABLE',
      status: 503,
    });
  }
}

function databaseError(
  error: { message?: string; code?: string } | null,
  fallbackMessage = 'The verification store rejected the operation.'
): SwiftError {
  const message = error?.message || fallbackMessage;

  if (message.includes('HOURLY_LIMIT_EXCEEDED')) {
    return new SwiftError('Hourly verification attempt limit reached for this account.', {
      code: 'HOURLY_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: 3600,
    });
  }
  if (message.includes('PHONE_LIMIT_EXCEEDED')) {
    return new SwiftError('Hourly verification attempt limit reached for this phone number.', {
      code: 'PHONE_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: 3600,
    });
  }
  if (message.includes('COOLDOWN_ACTIVE')) {
    return new SwiftError('Please wait before requesting a new verification code.', {
      code: 'COOLDOWN_ACTIVE',
      status: 429,
      retryAfterSeconds: 60,
    });
  }
  if (message.includes('CHALLENGE_ALREADY_CONSUMED')) {
    return new SwiftError('This verification challenge has already been consumed.', {
      code: 'CHALLENGE_ALREADY_CONSUMED',
      status: 409,
    });
  }
  if (message.includes('CHALLENGE_EXPIRED')) {
    return new SwiftError('The verification challenge has expired.', {
      code: 'CHALLENGE_EXPIRED',
      status: 410,
    });
  }
  if (message.includes('CHALLENGE_NOT_FOUND')) {
    return new SwiftError('No matching verification challenge was found.', {
      code: 'CHALLENGE_NOT_FOUND',
      status: 404,
    });
  }
  if (message.includes('CHALLENGE_NOT_READY')) {
    return new SwiftError('The verification challenge is still being created.', {
      code: 'CHALLENGE_NOT_READY',
      status: 409,
    });
  }
  if (message.includes('MAX_ATTEMPTS_EXCEEDED')) {
    return new SwiftError('Maximum verification attempts exceeded.', {
      code: 'MAX_ATTEMPTS_EXCEEDED',
      status: 429,
    });
  }

  return new SwiftError(fallbackMessage, {
    code: 'DATABASE_PERSISTENCE_FAILED',
    status: 500,
  });
}

function secondsUntil(value: string | undefined): number {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

export async function initiatePhoneVerification(params: {
  userId: string;
  phone: string;
  idempotencyKey?: string;
  customConfig?: any;
  customClient?: VerificationClient;
}) {
  const normalizedPhone = normalizeE164Phone(params.phone);
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();
  const supabase = resolveVerificationClient(params.customClient);

  const reservation = await supabase.rpc('reserve_verification_challenge', {
    p_user_id: params.userId,
    p_phone: normalizedPhone,
    p_idempotency_key: idempotencyKey,
  });

  if (reservation.error || !reservation.data) {
    throw databaseError(reservation.error);
  }

  if (reservation.data.state === 'existing') {
    return {
      requestId: reservation.data.request_id,
      expiresIn: secondsUntil(reservation.data.expires_at),
      resendAfter: secondsUntil(reservation.data.resend_available_at),
      status: 'QUEUED',
      phone: normalizedPhone,
    };
  }

  if (reservation.data.state === 'in_progress') {
    throw new SwiftError('A verification request with this idempotency key is already in progress.', {
      code: 'VERIFICATION_SEND_IN_PROGRESS',
      status: 409,
      retryAfterSeconds: 2,
    });
  }

  let swiftResult: Awaited<ReturnType<typeof sendOtp>>;
  try {
    swiftResult = await sendOtp(normalizedPhone, idempotencyKey, params.customConfig);
  } catch (error) {
    await supabase.rpc('cancel_verification_reservation', {
      p_user_id: params.userId,
      p_reservation_id: reservation.data.id,
    });
    throw error;
  }

  const expiresIn = swiftResult.expiresIn ?? 600;
  const resendAfter = swiftResult.resendAfter ?? 60;
  const finalized = await supabase.rpc('finalize_verification_challenge', {
    p_user_id: params.userId,
    p_reservation_id: reservation.data.id,
    p_request_id: swiftResult.requestId,
    p_expires_in_seconds: expiresIn,
    p_resend_after_seconds: resendAfter,
  });

  if (finalized.error || !finalized.data) {
    await supabase.rpc('cancel_verification_reservation', {
      p_user_id: params.userId,
      p_reservation_id: reservation.data.id,
    });
    throw databaseError(finalized.error, 'The verification challenge could not be persisted.');
  }

  return {
    requestId: swiftResult.requestId,
    expiresIn,
    resendAfter,
    status: 'QUEUED',
    phone: normalizedPhone,
  };
}

export async function confirmPhoneVerification(params: {
  userId: string;
  otp: string;
  requestId?: string;
  customConfig?: any;
  customClient?: VerificationClient;
}) {
  const otp = String(params.otp ?? '').trim();
  if (!otp) {
    throw new SwiftError('Verification code must not be empty.', {
      code: 'INVALID_OTP',
      status: 400,
    });
  }

  const supabase = resolveVerificationClient(params.customClient);
  const challenge = await supabase.rpc('get_verification_challenge', {
    p_user_id: params.userId,
    p_request_id: params.requestId || null,
  });

  if (challenge.error || !challenge.data) {
    throw databaseError(challenge.error);
  }

  let swiftResult: Awaited<ReturnType<typeof verifyOtp>>;
  try {
    swiftResult = await verifyOtp(
      {
        phone: challenge.data.phone,
        requestId: challenge.data.request_id,
        otp,
      },
      params.customConfig
    );
  } catch (error) {
    if (
      error instanceof SwiftError &&
      (error.code === 'SWIFT_WRONG_CODE' || error.code === 'SWIFT_INVALID_REQUEST')
    ) {
      const failure = await supabase.rpc('record_verification_failure', {
        p_user_id: params.userId,
        p_request_id: challenge.data.request_id,
      });
      if (failure.error) {
        throw databaseError(failure.error, 'The failed verification attempt could not be recorded.');
      }
    }
    throw error;
  }

  const verifiedAt = swiftResult.verifiedAt || new Date().toISOString();
  const proofId = challenge.data.request_id;
  const consumed = await supabase.rpc('consume_verification_success', {
    p_user_id: params.userId,
    p_request_id: challenge.data.request_id,
    p_proof_id: proofId,
    p_verified_at: verifiedAt,
  });

  if (consumed.error || !consumed.data) {
    throw databaseError(consumed.error, 'The successful verification could not be persisted.');
  }

  return {
    verified: true,
    phone: consumed.data.phone,
    verifiedAt: consumed.data.verified_at,
    proofId: consumed.data.proof_id,
  };
}

export async function getVerificationRecordAsync(
  userId: string,
  customClient?: VerificationClient
): Promise<VerificationRecord | null> {
  const supabase = resolveVerificationClient(customClient);
  const { data, error } = await supabase
    .from('verification_records')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw databaseError(error, 'The verification record could not be read.');
  }
  if (!data) return null;

  return {
    userId: data.user_id,
    phone: data.phone,
    proofId: data.proof_id,
    status: data.status,
    verifiedAt: data.verified_at,
  };
}
