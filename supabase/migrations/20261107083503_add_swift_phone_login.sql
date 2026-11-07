-- Migration: 20261107083503_add_swift_phone_login.sql
-- Description: Database-backed pre-auth phone login challenges, rate limits, and profile phone uniqueness

-- 1. Ensure internal schema exists
CREATE SCHEMA IF NOT EXISTS internal;

-- 2. Challenges table in internal schema
CREATE TABLE IF NOT EXISTS internal.phone_login_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  request_id TEXT NOT NULL,
  idempotency_key TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('donor_login', 'requester_login', 'volunteer_login')),
  requested_role TEXT NOT NULL CHECK (requested_role IN ('donor', 'requester', 'volunteer')),
  ip_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  resend_available_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_phone_login_challenges_lookup
  ON internal.phone_login_challenges(phone_hash, purpose, expires_at);

CREATE INDEX IF NOT EXISTS idx_phone_login_challenges_req
  ON internal.phone_login_challenges(request_id);

CREATE INDEX IF NOT EXISTS idx_phone_login_challenges_idem
  ON internal.phone_login_challenges(phone_hash, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Rate limits table in internal schema
CREATE TABLE IF NOT EXISTS internal.phone_login_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'ip')),
  window_start TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  send_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_phone_login_rate_limits_lookup
  ON internal.phone_login_rate_limits(identifier_hash, identifier_type, window_start);

-- 4. Unique partial index on public.profiles(phone)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles(phone)
  WHERE phone IS NOT NULL;

-- 5. Privileged functions in internal schema
CREATE OR REPLACE FUNCTION internal.record_phone_login_send(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_phone_window TIMESTAMPTZ;
  v_phone_count INT;
  v_ip_window TIMESTAMPTZ;
  v_ip_count INT;
  v_existing_id UUID;
  v_existing_req TEXT;
  v_existing_exp TIMESTAMPTZ;
  v_existing_resend TIMESTAMPTZ;
  v_new_id UUID;
  v_new_exp TIMESTAMPTZ;
  v_new_resend TIMESTAMPTZ;
BEGIN
  -- Check idempotency replay if idempotency key is provided
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, c.request_id, c.expires_at, c.resend_available_at
    INTO v_existing_id, v_existing_req, v_existing_exp, v_existing_resend
    FROM internal.phone_login_challenges c
    WHERE c.phone_hash = p_phone_hash
      AND c.idempotency_key = p_idempotency_key
      AND c.consumed_at IS NULL
      AND c.expires_at > pg_catalog.now()
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_id, v_existing_req, v_existing_exp, v_existing_resend, true;
      RETURN;
    END IF;
  END IF;

  -- Enforce resend cooldown (must not send if an active unexpired challenge is within resend cooldown)
  IF EXISTS (
    SELECT 1 FROM internal.phone_login_challenges
    WHERE phone_hash = p_phone_hash
      AND consumed_at IS NULL
      AND expires_at > pg_catalog.now()
      AND resend_available_at > pg_catalog.now()
  ) THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE' USING ERRCODE = 'P0002';
  END IF;

  -- Enforce per-phone hourly rate limit (max 5 sends per hour)
  SELECT window_start, send_count INTO v_phone_window, v_phone_count
  FROM internal.phone_login_rate_limits
  WHERE identifier_hash = p_phone_hash
    AND identifier_type = 'phone'
    AND window_start > pg_catalog.now() - interval '1 hour'
  ORDER BY window_start DESC
  LIMIT 1;

  IF v_phone_count >= 5 THEN
    RAISE EXCEPTION 'PHONE_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  -- Enforce per-IP hourly rate limit (max 20 sends per hour)
  SELECT window_start, send_count INTO v_ip_window, v_ip_count
  FROM internal.phone_login_rate_limits
  WHERE identifier_hash = p_ip_hash
    AND identifier_type = 'ip'
    AND window_start > pg_catalog.now() - interval '1 hour'
  ORDER BY window_start DESC
  LIMIT 1;

  IF v_ip_count >= 20 THEN
    RAISE EXCEPTION 'IP_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  -- Increment or insert phone rate limit record
  IF v_phone_window IS NOT NULL THEN
    UPDATE internal.phone_login_rate_limits
    SET send_count = send_count + 1
    WHERE identifier_hash = p_phone_hash AND identifier_type = 'phone' AND window_start = v_phone_window;
  ELSE
    INSERT INTO internal.phone_login_rate_limits (identifier_hash, identifier_type, window_start, send_count)
    VALUES (p_phone_hash, 'phone', pg_catalog.now(), 1);
  END IF;

  -- Increment or insert IP rate limit record
  IF v_ip_window IS NOT NULL THEN
    UPDATE internal.phone_login_rate_limits
    SET send_count = send_count + 1
    WHERE identifier_hash = p_ip_hash AND identifier_type = 'ip' AND window_start = v_ip_window;
  ELSE
    INSERT INTO internal.phone_login_rate_limits (identifier_hash, identifier_type, window_start, send_count)
    VALUES (p_ip_hash, 'ip', pg_catalog.now(), 1);
  END IF;

  -- Calculate expirations
  v_new_exp := pg_catalog.now() + (p_expires_in_seconds || ' seconds')::interval;
  v_new_resend := pg_catalog.now() + (p_resend_after_seconds || ' seconds')::interval;

  -- Insert challenge
  INSERT INTO internal.phone_login_challenges (
    phone_hash,
    phone_normalized,
    request_id,
    idempotency_key,
    purpose,
    requested_role,
    ip_hash,
    resend_available_at,
    expires_at
  )
  VALUES (
    p_phone_hash,
    p_phone_normalized,
    p_request_id,
    p_idempotency_key,
    p_purpose,
    p_requested_role,
    p_ip_hash,
    v_new_resend,
    v_new_exp
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, p_request_id, v_new_exp, v_new_resend, false;
END;
$$;

-- Verification challenge claim and atomic increment
CREATE OR REPLACE FUNCTION internal.claim_phone_login_challenge(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_record internal.phone_login_challenges%ROWTYPE;
BEGIN
  -- Lock row exclusively to prevent parallel races
  SELECT * INTO v_record
  FROM internal.phone_login_challenges
  WHERE phone_hash = p_phone_hash
    AND request_id = p_request_id
    AND purpose = p_purpose
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_FOUND' USING ERRCODE = 'P0003';
  END IF;

  IF v_record.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CHALLENGE_ALREADY_CONSUMED' USING ERRCODE = 'P0004';
  END IF;

  IF pg_catalog.now() > v_record.expires_at THEN
    RAISE EXCEPTION 'CHALLENGE_EXPIRED' USING ERRCODE = 'P0005';
  END IF;

  IF v_record.attempts >= v_record.max_attempts THEN
    RAISE EXCEPTION 'MAX_ATTEMPTS_EXCEEDED' USING ERRCODE = 'P0006';
  END IF;

  -- Increment attempt counter
  UPDATE internal.phone_login_challenges
  SET attempts = attempts + 1
  WHERE id = v_record.id;

  RETURN QUERY SELECT v_record.id, v_record.phone_normalized, v_record.requested_role, v_record.attempts + 1, v_record.max_attempts;
END;
$$;

-- Mark challenge consumed upon successful Swift verification
CREATE OR REPLACE FUNCTION internal.consume_phone_login_challenge(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE internal.phone_login_challenges
  SET consumed_at = pg_catalog.now()
  WHERE id = p_challenge_id AND consumed_at IS NULL;
END;
$$;

-- Revoke all direct permissions from untrusted roles
REVOKE ALL ON TABLE internal.phone_login_challenges FROM public, anon, authenticated;
REVOKE ALL ON TABLE internal.phone_login_rate_limits FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION internal.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION internal.claim_phone_login_challenge(TEXT, TEXT, TEXT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION internal.consume_phone_login_challenge(UUID) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION internal.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION internal.claim_phone_login_challenge(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION internal.consume_phone_login_challenge(UUID) TO service_role;


-- 6. Update complete_onboarding_tx to inherit verified phone from verification_records
CREATE OR REPLACE FUNCTION public.complete_onboarding_tx(
  p_user_id uuid,
  p_display_name text,
  p_role text,
  p_location_label text,
  p_address text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_vehicle_type text DEFAULT 'motorcycle',
  p_max_distance_km numeric DEFAULT 10.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text;
  v_is_verified boolean;
  v_verified_at timestamptz;
  v_profile public.profiles%ROWTYPE;
  v_location public.saved_locations%ROWTYPE;
  v_preferences public.volunteer_preferences%ROWTYPE;
BEGIN
  IF p_role NOT IN ('donor', 'requester', 'volunteer') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ONBOARDING_ROLE';
  END IF;

  IF p_display_name IS NULL
     OR char_length(btrim(p_display_name)) < 2
     OR char_length(p_display_name) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DISPLAY_NAME';
  END IF;

  IF p_latitude IS NULL
     OR p_longitude IS NULL
     OR p_latitude < -90
     OR p_latitude > 90
     OR p_longitude < -180
     OR p_longitude > 180 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_LOCATION';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PROFILE_ALREADY_EXISTS';
  END IF;

  -- Check if user already verified their phone via Swift prior to onboarding
  SELECT phone INTO v_phone
  FROM public.verification_records
  WHERE user_id = p_user_id AND status = 'verified'
  LIMIT 1;

  v_is_verified := p_role = 'volunteer' OR v_phone IS NOT NULL;
  v_verified_at := CASE WHEN v_is_verified THEN now() ELSE NULL END;

  INSERT INTO public.profiles (
    id,
    display_name,
    role,
    phone,
    is_verified,
    verified_at
  )
  VALUES (
    p_user_id,
    btrim(p_display_name),
    p_role,
    v_phone,
    v_is_verified,
    v_verified_at
  )
  RETURNING * INTO v_profile;

  INSERT INTO public.saved_locations (
    user_id,
    label,
    address,
    latitude,
    longitude,
    is_default
  )
  VALUES (
    p_user_id,
    COALESCE(NULLIF(btrim(p_location_label), ''), 'Default Location'),
    NULLIF(btrim(p_address), ''),
    p_latitude,
    p_longitude,
    true
  )
  RETURNING * INTO v_location;

  IF p_role = 'volunteer' THEN
    INSERT INTO public.volunteer_preferences (
      user_id,
      vehicle_type,
      max_distance_km,
      is_available
    )
    VALUES (
      p_user_id,
      COALESCE(p_vehicle_type, 'motorcycle'),
      COALESCE(p_max_distance_km, 10.0),
      true
    )
    RETURNING * INTO v_preferences;
  END IF;

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'location', to_jsonb(v_location),
    'volunteer_preferences', CASE
      WHEN p_role = 'volunteer' THEN to_jsonb(v_preferences)
      ELSE NULL
    END
  );
END;
$$;
