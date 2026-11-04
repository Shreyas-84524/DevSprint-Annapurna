/**
 * Server-only Verification DAL & Business Logic
 *
 * Handles durable verification sessions, cooldowns, rate limits,
 * and state transitions for donor/requester phone verification
 * backed authoritatively by Supabase database tables.
 */

import { sendOtp, verifyOtp, normalizeE164Phone, SwiftError } from './swift';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

const MAX_HOURLY_SENDS = 5;
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory cache mirrors durable database state for test fixtures and fast sync lookup
const recordsCache = new Map<string, VerificationRecord>();
const attemptsCache = new Map<string, PendingAttempt>();

// In-memory test store fallback when running in isolated test runners without live Supabase
class InMemoryTestSupabase {
  from(table: string) {
    return {
      select: (columns?: string, options?: { count?: 'exact' }) => {
        const filters: Record<string, any> = {};
        const query = {
          eq: (col: string, val: any) => {
            filters[col] = val;
            return query;
          },
          gt: (col: string, val: any) => {
            filters[`gt_${col}`] = val;
            return query;
          },
          gte: (col: string, val: any) => {
            filters[`gte_${col}`] = val;
            return query;
          },
          order: () => query,
          limit: () => query,
          maybeSingle: async () => {
            if (table === 'verification_attempts') {
              for (const a of attemptsCache.values()) {
                if (filters.user_id && a.userId !== filters.user_id) continue;
                if (filters.status && a.status !== filters.status) continue;
                if (filters.idempotency_key && a.idempotencyKey !== filters.idempotency_key) continue;
                if (filters.gt_expires_at && a.expiresAt <= new Date(filters.gt_expires_at).getTime()) continue;
                if (filters.gt_resend_available_at && a.resendAvailableAt <= new Date(filters.gt_resend_available_at).getTime()) continue;
                return {
                  data: {
                    id: a.id,
                    user_id: a.userId,
                    phone: a.phone,
                    request_id: a.requestId,
                    idempotency_key: a.idempotencyKey,
                    status: a.status,
                    expires_at: new Date(a.expiresAt).toISOString(),
                    resend_available_at: new Date(a.resendAvailableAt).toISOString(),
                    attempts_count: a.attemptsCount,
                    created_at: new Date(a.createdAt).toISOString(),
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }
            if (table === 'verification_records') {
              const r = recordsCache.get(filters.user_id);
              if (r) {
                return {
                  data: {
                    user_id: r.userId,
                    phone: r.phone,
                    proof_id: r.proofId,
                    status: r.status,
                    verified_at: r.verifiedAt,
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },
          then: async (resolve: any) => {
            if (options?.count === 'exact') {
              let count = 0;
              const gteTime = filters.gte_created_at ? new Date(filters.gte_created_at).getTime() : 0;
              for (const a of attemptsCache.values()) {
                if (filters.user_id && a.userId !== filters.user_id) continue;
                if (filters.phone && a.phone !== filters.phone) continue;
                if (a.createdAt >= gteTime) count++;
              }
              return resolve({ count, data: null, error: null });
            }
            const results: any[] = [];
            for (const a of attemptsCache.values()) {
              if (filters.user_id && a.userId !== filters.user_id) continue;
              if (filters.request_id && a.requestId !== filters.request_id) continue;
              results.push({
                id: a.id,
                user_id: a.userId,
                phone: a.phone,
                request_id: a.requestId,
                status: a.status,
                expires_at: new Date(a.expiresAt).toISOString(),
                attempts_count: a.attemptsCount,
              });
            }
            return resolve({ data: results, error: null });
          },
        };
        return query;
      },
      insert: (row: any) => {
        if (table === 'verification_attempts') {
          const attemptId = row.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          attemptsCache.set(attemptId, {
            id: attemptId,
            userId: row.user_id,
            phone: row.phone,
            requestId: row.request_id,
            idempotencyKey: row.idempotency_key,
            status: row.status,
            expiresAt: new Date(row.expires_at).getTime(),
            resendAvailableAt: new Date(row.resend_available_at).getTime(),
            attemptsCount: row.attempts_count || 0,
            createdAt: new Date(row.created_at).getTime(),
          });
        }
        return {
          select: () => ({
            single: async () => ({ data: row, error: null }),
          }),
          then: (resolve: any) => resolve({ data: row, error: null }),
        };
      },
      update: (updates: any) => {
        const filters: Record<string, any> = {};
        const query = {
          eq: (col: string, val: any) => {
            filters[col] = val;
            return query;
          },
          select: () => query,
          then: (resolve: any) => {
            const modified: any[] = [];
            if (table === 'verification_attempts') {
              for (const a of attemptsCache.values()) {
                if (filters.id && a.id !== filters.id && a.requestId !== filters.id) continue;
                if (filters.user_id && a.userId !== filters.user_id) continue;
                if (filters.status && a.status !== filters.status) continue;
                if (updates.status) a.status = updates.status;
                if (updates.attempts_count !== undefined) a.attemptsCount = updates.attempts_count;
                modified.push(a);
              }
            }
            return resolve({ data: modified, error: null });
          },
        };
        return query;
      },
      upsert: (row: any) => {
        if (table === 'verification_records') {
          recordsCache.set(row.user_id, {
            userId: row.user_id,
            phone: row.phone,
            proofId: row.proof_id,
            status: row.status,
            verifiedAt: row.verified_at,
          });
        }
        return {
          then: (resolve: any) => resolve({ data: row, error: null }),
        };
      },
    };
  }

  rpc = async (funcName: string, params: any) => {
    if (funcName === 'create_verification_challenge') {
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.idempotencyKey === params.p_idempotency_key && a.status === 'pending' && a.expiresAt > Date.now()) {
          return {
            data: {
              id: a.id,
              request_id: a.requestId,
              status: 'idempotent_existing',
              resend_available_at: new Date(a.resendAvailableAt).toISOString(),
              expires_at: new Date(a.expiresAt).toISOString(),
            },
            error: null,
          };
        }
      }
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.status === 'pending' && a.resendAvailableAt > Date.now()) {
          return { data: null, error: { message: 'Resend cooldown active.' } };
        }
      }
      let count = 0;
      const oneHourAgo = Date.now() - 3600000;
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.createdAt >= oneHourAgo) count++;
      }
      if (count >= 5) {
        return { data: null, error: { message: 'Hourly verification attempt limit reached for this account' } };
      }
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.status === 'pending') {
          a.status = 'expired';
        }
      }
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const expiresAt = Date.now() + (params.p_expires_in_seconds || 600) * 1000;
      const resendAvailableAt = Date.now() + (params.p_resend_cooldown_seconds || 60) * 1000;
      attemptsCache.set(attemptId, {
        id: attemptId,
        userId: params.p_user_id,
        phone: params.p_phone,
        requestId: params.p_request_id,
        idempotencyKey: params.p_idempotency_key,
        status: 'pending',
        expiresAt,
        resendAvailableAt,
        attemptsCount: 0,
        createdAt: Date.now(),
      });
      return {
        data: {
          id: attemptId,
          request_id: params.p_request_id,
          status: 'created',
          resend_available_at: new Date(resendAvailableAt).toISOString(),
          expires_at: new Date(expiresAt).toISOString(),
        },
        error: null,
      };
    }
    if (funcName === 'consume_verification_success') {
      let found = null;
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.requestId === params.p_request_id && a.status === 'pending') {
          found = a;
          break;
        }
      }
      if (!found) {
        return { data: null, error: { message: 'No matching pending verification attempt found' } };
      }
      if (found.expiresAt <= Date.now()) {
        found.status = 'expired';
        return { data: null, error: { message: 'Verification challenge has expired' } };
      }
      found.status = 'consumed';
      recordsCache.set(params.p_user_id, {
        userId: params.p_user_id,
        phone: found.phone,
        proofId: params.p_proof_id,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
      });
      return {
        data: {
          success: true,
          phone: found.phone,
          proof_id: params.p_proof_id,
          verified_at: new Date().toISOString(),
        },
        error: null,
      };
    }
    if (funcName === 'record_verification_failure') {
      let found = null;
      for (const a of attemptsCache.values()) {
        if (a.userId === params.p_user_id && a.requestId === params.p_request_id && a.status === 'pending') {
          found = a;
          break;
        }
      }
      if (!found) {
        return { data: null, error: { message: 'No matching pending verification attempt found' } };
      }
      found.attemptsCount++;
      if (found.attemptsCount >= 5) {
        found.status = 'expired';
        return { data: { attempts_count: found.attemptsCount, remaining_attempts: 0, status: 'locked' }, error: null };
      }
      return { data: { attempts_count: found.attemptsCount, remaining_attempts: 5 - found.attemptsCount, status: 'pending' }, error: null };
    }
    return { data: null, error: { message: `Unknown RPC function: ${funcName}` } };
  };
}

let customTestClientOverride: any = null;

export function setTestVerificationClient(client: any) {
  customTestClientOverride = client;
}

export function createTestVerificationDb() {
  return new InMemoryTestSupabase();
}

/**
 * Resolves the appropriate Supabase client for verification operations.
 * Fails closed in production if durable credentials are missing.
 */
async function resolveVerificationClient(customClient?: any) {
  if (customClient) return customClient;
  if (customTestClientOverride) return customTestClientOverride;
  try {
    return getServiceRoleClient();
  } catch {
    throw new SwiftError('Durable database store is unavailable for verification.', {
      code: 'DURABLE_STORE_UNAVAILABLE',
      status: 500,
    });
  }
}

/**
 * Initiates an OTP send for an authenticated user with durable state tracking in Supabase.
 */
export async function initiatePhoneVerification(params: {
  userId: string;
  phone: string;
  idempotencyKey?: string;
  customConfig?: any;
  customClient?: any;
}) {
  const { userId } = params;
  const normalizedPhone = normalizeE164Phone(params.phone);
  const now = Date.now();
  const supabase = await resolveVerificationClient(params.customClient);

  // 1. Check idempotency: If caller explicitly provided an idempotency key and matching pending attempt exists
  if (params.idempotencyKey) {
    const { data: existingKeyAttempt } = await supabase
      .from('verification_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('idempotency_key', params.idempotencyKey)
      .eq('status', 'pending')
      .gt('expires_at', new Date(now).toISOString())
      .maybeSingle();

    if (existingKeyAttempt) {
      return {
        requestId: existingKeyAttempt.request_id,
        expiresIn: Math.max(0, Math.ceil((new Date(existingKeyAttempt.expires_at).getTime() - now) / 1000)),
        resendAfter: Math.max(0, Math.ceil((new Date(existingKeyAttempt.resend_available_at).getTime() - now) / 1000)),
        status: 'QUEUED',
        phone: normalizedPhone,
      };
    }
  }

  const resolvedIdempotencyKey = params.idempotencyKey || `send_${userId}_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // 2. Check active cooldown
  const { data: activePending } = await supabase
    .from('verification_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gt('resend_available_at', new Date(now).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activePending) {
    const remainingSeconds = Math.ceil((new Date(activePending.resend_available_at).getTime() - now) / 1000);
    throw new SwiftError(
      `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      {
        code: 'COOLDOWN_ACTIVE',
        status: 429,
        retryAfterSeconds: remainingSeconds,
      }
    );
  }

  // 3. Check hourly rate limit per account
  const oneHourAgo = new Date(now - 3600 * 1000).toISOString();
  const { count: userSendCount, error: userCountError } = await supabase
    .from('verification_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (!userCountError && typeof userSendCount === 'number' && userSendCount >= MAX_HOURLY_SENDS) {
    throw new SwiftError('Hourly verification attempt limit reached for this account. Please try again later.', {
      code: 'HOURLY_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: 3600,
    });
  }

  // 4. Check hourly rate limit per phone number
  const { count: phoneSendCount, error: phoneCountError } = await supabase
    .from('verification_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('phone', normalizedPhone)
    .gte('created_at', oneHourAgo);

  if (!phoneCountError && typeof phoneSendCount === 'number' && phoneSendCount >= MAX_HOURLY_SENDS) {
    throw new SwiftError('Hourly verification attempt limit reached for this phone number. Please try again later.', {
      code: 'PHONE_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: 3600,
    });
  }

  // 5. Call upstream Swift service
  const swiftResult = await sendOtp(normalizedPhone, resolvedIdempotencyKey, params.customConfig);

  // 6. Expire any previous pending attempts for this user
  await supabase
    .from('verification_attempts')
    .update({ status: 'expired', updated_at: new Date(now).toISOString() })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // 7. Durably persist pending challenge record in Supabase
  const expiresInSeconds = swiftResult.expiresIn ?? 600;
  const resendAfterSeconds = swiftResult.resendAfter ?? 60;
  const expiresAt = new Date(now + expiresInSeconds * 1000).toISOString();
  const resendAvailableAt = new Date(now + resendAfterSeconds * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('verification_attempts')
    .insert({
      user_id: userId,
      phone: normalizedPhone,
      request_id: swiftResult.requestId,
      idempotency_key: resolvedIdempotencyKey,
      status: 'pending',
      expires_at: expiresAt,
      resend_available_at: resendAvailableAt,
      attempts_count: 0,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    });

  if (insertError) {
    console.error('Failed to durably persist verification challenge:', insertError);
    throw new SwiftError('Database error occurred while recording verification challenge.', {
      code: 'PERSISTENCE_FAILED',
      status: 500,
    });
  }

  return {
    requestId: swiftResult.requestId,
    expiresIn: expiresInSeconds,
    resendAfter: resendAfterSeconds,
    status: 'QUEUED',
    phone: normalizedPhone,
  };
}

/**
 * Confirms OTP code against the user's active pending verification challenge in Supabase.
 * Enforces atomic state transitions, increments retry counters, and stores the authoritative
 * Swift request proof ID on success.
 */
export async function confirmPhoneVerification(params: {
  userId: string;
  otp: string;
  requestId?: string;
  customConfig?: any;
  customClient?: any;
}) {
  const { userId } = params;
  const otpString = String(params.otp ?? '').trim();
  const now = Date.now();
  const supabase = await resolveVerificationClient(params.customClient);

  if (!otpString) {
    throw new SwiftError('Verification code must not be empty', {
      code: 'INVALID_OTP',
      status: 400,
    });
  }

  // 1. Locate active pending attempt for this user
  let query = supabase
    .from('verification_attempts')
    .select('*')
    .eq('user_id', userId);

  if (params.requestId) {
    query = query.eq('request_id', params.requestId);
  }

  const { data: attempts, error: fetchError } = await query.order('created_at', { ascending: false });

  if (fetchError || !attempts || attempts.length === 0) {
    throw new SwiftError('No active verification challenge found for this user. Please request a new code.', {
      code: 'CHALLENGE_NOT_FOUND',
      status: 404,
    });
  }

  const activeAttempt = attempts.find((a: any) => a.status === 'pending');

  if (!activeAttempt) {
    const consumedAttempt = attempts.find((a: any) => a.status === 'consumed');
    if (consumedAttempt) {
      throw new SwiftError('This verification code has already been consumed and cannot be reused.', {
        code: 'CHALLENGE_ALREADY_CONSUMED',
        status: 400,
      });
    }

    throw new SwiftError('The verification code has expired. Please request a new code.', {
      code: 'CHALLENGE_EXPIRED',
      status: 410,
    });
  }

  // 2. Check expiration
  if (now > new Date(activeAttempt.expires_at).getTime()) {
    await supabase
      .from('verification_attempts')
      .update({ status: 'expired', updated_at: new Date(now).toISOString() })
      .eq('id', activeAttempt.id);

    throw new SwiftError('The verification code has expired. Please request a new code.', {
      code: 'CHALLENGE_EXPIRED',
      status: 410,
    });
  }

  // 3. Check attempt counter
  if (activeAttempt.attempts_count >= MAX_VERIFY_ATTEMPTS) {
    await supabase
      .from('verification_attempts')
      .update({ status: 'expired', updated_at: new Date(now).toISOString() })
      .eq('id', activeAttempt.id);

    throw new SwiftError('Maximum verification attempts exceeded. Please request a new code.', {
      code: 'MAX_ATTEMPTS_EXCEEDED',
      status: 429,
    });
  }

  // 4. Call Swift verify endpoint
  let verifyResult: any;
  try {
    verifyResult = await verifyOtp(
      {
        phone: activeAttempt.phone,
        requestId: activeAttempt.request_id,
        otp: otpString,
      },
      params.customConfig
    );
  } catch (err: any) {
    // Increment attempts_count in Supabase on invalid verification
    const newCount = (activeAttempt.attempts_count || 0) + 1;
    const isLocked = newCount >= MAX_VERIFY_ATTEMPTS;

    await supabase
      .from('verification_attempts')
      .update({
        attempts_count: newCount,
        status: isLocked ? 'expired' : 'pending',
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', activeAttempt.id);

    throw err;
  }

  // 5. Swift verified successfully: Atomically consume attempt, store proof, and update profile
  const verifiedAt = verifyResult.verifiedAt || new Date().toISOString();
  const proofId = activeAttempt.request_id; // Authoritative Swift request ID proof

  if (typeof supabase.rpc === 'function') {
    const { error: rpcError } = await supabase.rpc('consume_verification_success', {
      p_user_id: userId,
      p_request_id: activeAttempt.request_id,
      p_proof_id: proofId,
    });

    if (rpcError) {
      console.error('Failed to consume verification atomically via RPC:', rpcError);
      throw new SwiftError('Database error occurred while finalizing verification atomically.', {
        code: 'DATABASE_PERSISTENCE_FAILED',
        status: 500,
      });
    }
  } else {
    // Condition-checked update: ensure row is still pending before consuming
    const { data: consumedRows, error: consumeError } = await supabase
      .from('verification_attempts')
      .update({
        status: 'consumed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeAttempt.id)
      .eq('status', 'pending')
      .select('*');

    if (consumeError || (consumedRows && consumedRows.length === 0)) {
      throw new SwiftError('Challenge was already consumed or invalid.', {
        code: 'CHALLENGE_ALREADY_CONSUMED',
        status: 409,
      });
    }

    const { error: recordError } = await supabase
      .from('verification_records')
      .upsert({
        user_id: userId,
        phone: activeAttempt.phone,
        proof_id: proofId,
        status: 'verified',
        verified_at: verifiedAt,
        updated_at: new Date().toISOString(),
      });

    if (recordError) {
      throw new SwiftError('Database error occurred while recording verification evidence.', {
        code: 'DATABASE_PERSISTENCE_FAILED',
        status: 500,
      });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        phone: activeAttempt.phone,
        verified_at: verifiedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      throw new SwiftError('Database error occurred while updating profile verification.', {
        code: 'DATABASE_PERSISTENCE_FAILED',
        status: 500,
      });
    }
  }

  // Update in-memory mirror cache
  recordsCache.set(userId, {
    userId,
    phone: activeAttempt.phone,
    proofId,
    status: 'verified',
    verifiedAt,
  });

  return {
    verified: true,
    phone: activeAttempt.phone,
    verifiedAt,
    proofId,
  };
}

/**
 * Retrieves the verification record for a given user.
 */
export function getVerificationRecord(userId: string): VerificationRecord | null {
  return recordsCache.get(userId) || null;
}

/**
 * Asynchronously retrieves the verification record for a given user from Supabase.
 */
export async function getVerificationRecordAsync(
  userId: string,
  customClient?: any
): Promise<VerificationRecord | null> {
  const supabase = await resolveVerificationClient(customClient);
  const { data } = await supabase
    .from('verification_records')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  return {
    userId: data.user_id,
    phone: data.phone,
    proofId: data.proof_id,
    status: data.status,
    verifiedAt: data.verified_at,
  };
}

/**
 * Resets verification stores (for isolated test fixtures).
 */
export function resetVerificationStores(): void {
  recordsCache.clear();
  attemptsCache.clear();
}
