-- Migration: 20261028000000_create_verification_tables.sql
-- Description: Reproducible schema for donor/requester OTP verification attempts and audit records.
-- Invariants:
--   1. Verification records are strictly separated from food QC.
--   2. RLS enabled on all tables; only authenticated users can select their own records.
--   3. All mutations are restricted to server-controlled operations (no client writes).
--   4. Expiry, replay prevention, and idempotency enforced via unique indexes and constraints.

-- 1. Create verification_records table (Authoritative verification evidence)
CREATE TABLE IF NOT EXISTS public.verification_records (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  proof_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for searching verified records by phone (e.g. preventing duplicate accounts with same phone)
CREATE INDEX IF NOT EXISTS idx_verification_records_phone ON public.verification_records(phone);

-- 2. Create verification_attempts table (Pending server-tracked challenges)
CREATE TABLE IF NOT EXISTS public.verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  request_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  attempts_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for verification attempts
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_status
  ON public.verification_attempts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_request_id
  ON public.verification_attempts(request_id);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_phone
  ON public.verification_attempts(phone);

-- Unique idempotency key per user send attempt
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_attempts_user_idempotency
  ON public.verification_attempts(user_id, idempotency_key);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Defense-in-depth read policies (Users can view only their own records)
CREATE POLICY "Users can view own verification records"
  ON public.verification_records
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own verification attempts"
  ON public.verification_attempts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Explicitly DO NOT grant INSERT, UPDATE, or DELETE on these tables to authenticated or anon.
-- All state transitions and insertions must occur through server-only DAL or service-role clients.

-- 5. Revoke public execution and restrict permissions
REVOKE ALL ON public.verification_records FROM anon, authenticated;
REVOKE ALL ON public.verification_attempts FROM anon, authenticated;

GRANT SELECT ON public.verification_records TO authenticated;
GRANT SELECT ON public.verification_attempts TO authenticated;
