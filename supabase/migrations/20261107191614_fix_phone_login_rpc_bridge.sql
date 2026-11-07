-- Expose narrowly-scoped RPC entry points in the public API schema while
-- keeping challenge tables and implementation functions in `internal`.
-- PostgREST only exposes configured schemas (public by default), so calling
-- supabase.rpc('record_phone_login_send') could not resolve the original
-- internal.record_phone_login_send function.

GRANT USAGE ON SCHEMA internal TO service_role;

CREATE OR REPLACE FUNCTION public.record_phone_login_send(
  p_phone_hash TEXT,
  p_phone_normalized TEXT,
  p_request_id TEXT,
  p_idempotency_key TEXT,
  p_purpose TEXT,
  p_requested_role TEXT,
  p_ip_hash TEXT,
  p_expires_in_seconds INT,
  p_resend_after_seconds INT
)
RETURNS TABLE (
  challenge_id UUID,
  request_id TEXT,
  expires_at TIMESTAMPTZ,
  resend_available_at TIMESTAMPTZ,
  replayed BOOLEAN
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM internal.record_phone_login_send(
    p_phone_hash,
    p_phone_normalized,
    p_request_id,
    p_idempotency_key,
    p_purpose,
    p_requested_role,
    p_ip_hash,
    p_expires_in_seconds,
    p_resend_after_seconds
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_phone_login_challenge(
  p_phone_hash TEXT,
  p_request_id TEXT,
  p_purpose TEXT
)
RETURNS TABLE (
  challenge_id UUID,
  phone_normalized TEXT,
  requested_role TEXT,
  attempts INT,
  max_attempts INT
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM internal.claim_phone_login_challenge(
    p_phone_hash,
    p_request_id,
    p_purpose
  );
$$;

CREATE OR REPLACE FUNCTION public.consume_phone_login_challenge(
  p_challenge_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT internal.consume_phone_login_challenge(p_challenge_id);
$$;

REVOKE ALL ON FUNCTION public.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_phone_login_challenge(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_phone_login_challenge(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_phone_login_challenge(TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_phone_login_challenge(UUID)
  TO service_role;

COMMENT ON FUNCTION public.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT)
  IS 'Service-role-only PostgREST bridge to the private phone login challenge recorder.';
COMMENT ON FUNCTION public.claim_phone_login_challenge(TEXT, TEXT, TEXT)
  IS 'Service-role-only PostgREST bridge to atomically claim a private phone login challenge.';
COMMENT ON FUNCTION public.consume_phone_login_challenge(UUID)
  IS 'Service-role-only PostgREST bridge to consume a private phone login challenge.';

NOTIFY pgrst, 'reload schema';
