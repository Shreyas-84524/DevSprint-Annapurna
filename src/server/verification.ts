/**
 * Server-only Verification DAL & Business Logic
 *
 * Handles pending verification sessions, cooldowns, rate limits,
 * and state transitions for donor/requester phone verification.
 */

import { sendOtp, verifyOtp, normalizeE164Phone, SwiftError } from './swift';

export interface PendingAttempt {
  id: string;
  userId: string;
  phone: string;
  requestId: string;
  idempotencyKey: string;
  status: 'pending' | 'consumed' | 'expired';
  expiresAt: number; // epoch ms
  resendAvailableAt: number; // epoch ms
  attemptsCount: number;
  createdAt: number;
}

export interface VerificationRecord {
  userId: string;
  phone: string;
  proofId: string;
  status: 'verified' | 'revoked';
  verifiedAt: string;
}

// In-memory registry for rate limiting and server session tracking.
// Mirrors database state and provides instant fallback/testing capabilities.
const attemptsStore = new Map<string, PendingAttempt>();
const recordsStore = new Map<string, VerificationRecord>();

// Hourly rate-limiting trackers: key -> timestamps[]
const userSendTimestamps = new Map<string, number[]>();
const phoneSendTimestamps = new Map<string, number[]>();

const MAX_HOURLY_SENDS = 5;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Clean up expired rate-limit timestamps older than 1 hour.
 */
function pruneTimestamps(timestamps: number[]): number[] {
  const oneHourAgo = Date.now() - 3600 * 1000;
  return timestamps.filter((t) => t > oneHourAgo);
}

/**
 * Checks per-user and per-phone hourly rate limits.
 */
function checkAbuseLimits(userId: string, phone: string): void {
  const now = Date.now();

  const userSends = pruneTimestamps(userSendTimestamps.get(userId) || []);
  if (userSends.length >= MAX_HOURLY_SENDS) {
    throw new SwiftError('Hourly verification attempt limit reached for this account. Please try again later.', {
      code: 'HOURLY_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: Math.ceil((userSends[0] + 3600 * 1000 - now) / 1000),
    });
  }

  const phoneSends = pruneTimestamps(phoneSendTimestamps.get(phone) || []);
  if (phoneSends.length >= MAX_HOURLY_SENDS) {
    throw new SwiftError('Hourly verification attempt limit reached for this phone number. Please try again later.', {
      code: 'PHONE_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: Math.ceil((phoneSends[0] + 3600 * 1000 - now) / 1000),
    });
  }
}

/**
 * Records a successful send event in rate-limiting trackers.
 */
function recordSendEvent(userId: string, phone: string): void {
  const now = Date.now();
  const userSends = pruneTimestamps(userSendTimestamps.get(userId) || []);
  userSends.push(now);
  userSendTimestamps.set(userId, userSends);

  const phoneSends = pruneTimestamps(phoneSendTimestamps.get(phone) || []);
  phoneSends.push(now);
  phoneSendTimestamps.set(phone, phoneSends);
}

/**
 * Initiates an OTP send for an authenticated user.
 */
export async function initiatePhoneVerification(params: {
  userId: string;
  phone: string;
  idempotencyKey?: string;
  customConfig?: any;
}) {
  const { userId } = params;
  const normalizedPhone = normalizeE164Phone(params.phone);
  const now = Date.now();

  // 1. Check existing pending attempts for active cooldown
  for (const attempt of attemptsStore.values()) {
    if (attempt.userId === userId && attempt.status === 'pending') {
      if (now < attempt.resendAvailableAt) {
        const remainingSeconds = Math.ceil((attempt.resendAvailableAt - now) / 1000);
        throw new SwiftError(
          `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
          {
            code: 'COOLDOWN_ACTIVE',
            status: 429,
            retryAfterSeconds: remainingSeconds,
          }
        );
      }
      // If cooldown passed but old attempt not consumed, mark as expired
      attempt.status = 'expired';
    }
  }

  // 2. Check abuse limits (max 5 per hour)
  checkAbuseLimits(userId, normalizedPhone);

  // 3. Resolve idempotency key
  const idempotencyKey = params.idempotencyKey || `send_${userId}_${now}`;

  // 4. Call upstream Swift service
  const swiftResult = await sendOtp(normalizedPhone, idempotencyKey, params.customConfig);

  // 5. Record send in rate-limiting trackers
  recordSendEvent(userId, normalizedPhone);

  // 6. Store pending challenge record
  const attemptRecord: PendingAttempt = {
    id: `att_${now}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    phone: normalizedPhone,
    requestId: swiftResult.requestId,
    idempotencyKey,
    status: 'pending',
    expiresAt: now + (swiftResult.expiresIn ?? 300) * 1000,
    resendAvailableAt: now + (swiftResult.resendAfter ?? 30) * 1000,
    attemptsCount: 0,
    createdAt: now,
  };

  attemptsStore.set(attemptRecord.id, attemptRecord);

  return {
    requestId: swiftResult.requestId,
    expiresIn: swiftResult.expiresIn,
    resendAfter: swiftResult.resendAfter,
    status: 'QUEUED',
    phone: normalizedPhone,
  };
}

/**
 * Confirms OTP code against the user's active pending verification record.
 */
export async function confirmPhoneVerification(params: {
  userId: string;
  otp: string;
  requestId?: string;
  customConfig?: any;
}) {
  const { userId } = params;
  const otpString = String(params.otp ?? '').trim();
  const now = Date.now();

  if (!otpString) {
    throw new SwiftError('Verification code must not be empty', {
      code: 'INVALID_OTP',
      status: 400,
    });
  }

  // 1. Locate active pending attempt for this user
  let activeAttempt: PendingAttempt | undefined;

  for (const attempt of attemptsStore.values()) {
    if (attempt.userId === userId) {
      if (params.requestId && attempt.requestId !== params.requestId) {
        continue;
      }
      if (attempt.status === 'pending') {
        activeAttempt = attempt;
        break;
      } else if (attempt.status === 'consumed' && params.requestId === attempt.requestId) {
        throw new SwiftError('This verification code has already been consumed and cannot be reused.', {
          code: 'CHALLENGE_ALREADY_CONSUMED',
          status: 400,
        });
      }
    }
  }

  if (!activeAttempt) {
    throw new SwiftError('No active verification challenge found for this user. Please request a new code.', {
      code: 'CHALLENGE_NOT_FOUND',
      status: 404,
    });
  }

  // 2. Check expiration
  if (now > activeAttempt.expiresAt) {
    activeAttempt.status = 'expired';
    throw new SwiftError('The verification code has expired. Please request a new code.', {
      code: 'CHALLENGE_EXPIRED',
      status: 410,
    });
  }

  // 3. Check attempt count
  activeAttempt.attemptsCount += 1;
  if (activeAttempt.attemptsCount > MAX_VERIFY_ATTEMPTS) {
    activeAttempt.status = 'expired';
    throw new SwiftError('Maximum verification attempts exceeded. Please request a new code.', {
      code: 'MAX_ATTEMPTS_EXCEEDED',
      status: 429,
    });
  }

  // 4. Call Swift verify endpoint
  const verifyResult = await verifyOtp(
    {
      phone: activeAttempt.phone,
      requestId: activeAttempt.requestId,
      otp: otpString,
    },
    params.customConfig
  );

  // 5. Consume pending attempt
  activeAttempt.status = 'consumed';

  // 6. Upsert authoritative verification record
  const verificationRecord: VerificationRecord = {
    userId,
    phone: activeAttempt.phone,
    proofId: activeAttempt.requestId,
    status: 'verified',
    verifiedAt: verifyResult.verifiedAt || new Date().toISOString(),
  };

  recordsStore.set(userId, verificationRecord);

  return {
    verified: true,
    phone: activeAttempt.phone,
    verifiedAt: verificationRecord.verifiedAt,
  };
}

/**
 * Retrieves the verification record for a given user.
 */
export function getVerificationRecord(userId: string): VerificationRecord | null {
  return recordsStore.get(userId) || null;
}

/**
 * Resets stores (primarily for isolated test fixtures).
 */
export function resetVerificationStores(): void {
  attemptsStore.clear();
  recordsStore.clear();
  userSendTimestamps.clear();
  phoneSendTimestamps.clear();
}
