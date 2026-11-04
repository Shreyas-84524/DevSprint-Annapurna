import { randomUUID } from 'node:crypto';

interface Attempt {
  id: string;
  user_id: string;
  phone: string;
  request_id: string;
  idempotency_key: string;
  status: 'reserved' | 'pending' | 'consumed' | 'expired';
  expires_at: string;
  resend_available_at: string;
  attempts_count: number;
  created_at: string;
  updated_at: string;
}

export class InMemoryVerificationClient {
  readonly attempts = new Map<string, Attempt>();
  readonly records = new Map<string, any>();

  async rpc(name: string, args: Record<string, any>) {
    try {
      switch (name) {
        case 'reserve_verification_challenge':
          return { data: this.reserve(args), error: null };
        case 'finalize_verification_challenge':
          return { data: this.finalize(args), error: null };
        case 'cancel_verification_reservation':
          return { data: this.cancel(args), error: null };
        case 'get_verification_challenge':
          return { data: this.getChallenge(args), error: null };
        case 'record_verification_failure':
          return { data: this.recordFailure(args), error: null };
        case 'consume_verification_success':
          return { data: this.consume(args), error: null };
        default:
          return { data: null, error: { message: `UNKNOWN_RPC:${name}` } };
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  from(table: string) {
    if (table !== 'verification_records') {
      throw new Error(`Unsupported test table: ${table}`);
    }

    return {
      select: () => {
        const filters: Record<string, unknown> = {};
        const query = {
          eq: (column: string, value: unknown) => {
            filters[column] = value;
            return query;
          },
          maybeSingle: async () => ({
            data: this.records.get(String(filters.user_id)) || null,
            error: null,
          }),
        };
        return query;
      },
    };
  }

  private reserve(args: Record<string, any>) {
    const now = Date.now();
    const attempts = [...this.attempts.values()];
    for (const attempt of attempts) {
      if (
        attempt.user_id === args.p_user_id &&
        (attempt.status === 'reserved' || attempt.status === 'pending') &&
        new Date(attempt.expires_at).getTime() <= now
      ) {
        attempt.status = 'expired';
      }
    }

    const idempotent = attempts.find(
      (attempt) =>
        attempt.user_id === args.p_user_id &&
        attempt.idempotency_key === args.p_idempotency_key &&
        (attempt.status === 'reserved' || attempt.status === 'pending')
    );
    if (idempotent) {
      return {
        id: idempotent.id,
        state: idempotent.status === 'pending' ? 'existing' : 'in_progress',
        request_id: idempotent.request_id,
        expires_at: idempotent.expires_at,
        resend_available_at: idempotent.resend_available_at,
      };
    }

    const recentUserAttempts = attempts.filter(
      (attempt) => attempt.user_id === args.p_user_id && now - new Date(attempt.created_at).getTime() < 3_600_000
    );
    if (recentUserAttempts.length >= 5) throw new Error('HOURLY_LIMIT_EXCEEDED');

    const recentPhoneAttempts = attempts.filter(
      (attempt) => attempt.phone === args.p_phone && now - new Date(attempt.created_at).getTime() < 3_600_000
    );
    if (recentPhoneAttempts.length >= 5) throw new Error('PHONE_LIMIT_EXCEEDED');

    const active = attempts.find(
      (attempt) => attempt.user_id === args.p_user_id && attempt.status === 'pending'
    );
    if (active && new Date(active.resend_available_at).getTime() > now) {
      throw new Error('COOLDOWN_ACTIVE');
    }

    for (const attempt of attempts) {
      if (
        attempt.user_id === args.p_user_id &&
        (attempt.status === 'reserved' || attempt.status === 'pending')
      ) {
        attempt.status = 'expired';
      }
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const attempt: Attempt = {
      id,
      user_id: args.p_user_id,
      phone: args.p_phone,
      request_id: `reserved:${id}`,
      idempotency_key: args.p_idempotency_key,
      status: 'reserved',
      expires_at: new Date(now + 120_000).toISOString(),
      resend_available_at: new Date(now + 60_000).toISOString(),
      attempts_count: 0,
      created_at: createdAt,
      updated_at: createdAt,
    };
    this.attempts.set(id, attempt);
    return {
      id,
      state: 'reserved',
      request_id: attempt.request_id,
      expires_at: attempt.expires_at,
      resend_available_at: attempt.resend_available_at,
    };
  }

  private finalize(args: Record<string, any>) {
    const attempt = this.attempts.get(args.p_reservation_id);
    if (!attempt || attempt.user_id !== args.p_user_id || attempt.status !== 'reserved') {
      throw new Error('RESERVATION_NOT_FOUND');
    }
    attempt.request_id = args.p_request_id;
    attempt.status = 'pending';
    attempt.expires_at = new Date(Date.now() + args.p_expires_in_seconds * 1000).toISOString();
    attempt.resend_available_at = new Date(Date.now() + args.p_resend_after_seconds * 1000).toISOString();
    attempt.updated_at = new Date().toISOString();
    return { ...attempt };
  }

  private cancel(args: Record<string, any>) {
    const attempt = this.attempts.get(args.p_reservation_id);
    if (!attempt || attempt.user_id !== args.p_user_id || attempt.status !== 'reserved') return false;
    attempt.status = 'expired';
    return true;
  }

  private getChallenge(args: Record<string, any>) {
    const attempt = [...this.attempts.values()]
      .filter(
        (candidate) =>
          candidate.user_id === args.p_user_id &&
          (!args.p_request_id || candidate.request_id === args.p_request_id)
      )
      .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
    if (!attempt) throw new Error('CHALLENGE_NOT_FOUND');
    if (attempt.status === 'consumed') throw new Error('CHALLENGE_ALREADY_CONSUMED');
    if (attempt.status === 'reserved') throw new Error('CHALLENGE_NOT_READY');
    if (attempt.status === 'expired' || new Date(attempt.expires_at).getTime() <= Date.now()) {
      attempt.status = 'expired';
      throw new Error('CHALLENGE_EXPIRED');
    }
    if (attempt.attempts_count >= 5) throw new Error('MAX_ATTEMPTS_EXCEEDED');
    return { ...attempt };
  }

  private recordFailure(args: Record<string, any>) {
    const attempt = [...this.attempts.values()].find(
      (candidate) =>
        candidate.user_id === args.p_user_id &&
        candidate.request_id === args.p_request_id &&
        candidate.status === 'pending'
    );
    if (!attempt) throw new Error('CHALLENGE_NOT_FOUND');
    attempt.attempts_count += 1;
    if (attempt.attempts_count >= 5) attempt.status = 'expired';
    return {
      attempts_count: attempt.attempts_count,
      remaining_attempts: Math.max(0, 5 - attempt.attempts_count),
      status: attempt.status === 'expired' ? 'locked' : 'pending',
    };
  }

  private consume(args: Record<string, any>) {
    const attempt = [...this.attempts.values()].find(
      (candidate) =>
        candidate.user_id === args.p_user_id &&
        candidate.request_id === args.p_request_id &&
        candidate.status === 'pending'
    );
    if (!attempt) throw new Error('CHALLENGE_ALREADY_CONSUMED');
    attempt.status = 'consumed';
    const record = {
      user_id: args.p_user_id,
      phone: attempt.phone,
      proof_id: args.p_proof_id,
      status: 'verified',
      verified_at: args.p_verified_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.records.set(args.p_user_id, record);
    return {
      verified: true,
      phone: record.phone,
      proof_id: record.proof_id,
      verified_at: record.verified_at,
    };
  }
}
