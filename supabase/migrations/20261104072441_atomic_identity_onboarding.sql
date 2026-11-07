-- Atomic identity, onboarding, and least-privilege corrections.

ALTER TABLE public.verification_attempts
  DROP CONSTRAINT IF EXISTS verification_attempts_status_check;

ALTER TABLE public.verification_attempts
  ADD CONSTRAINT verification_attempts_status_check
  CHECK (status IN ('reserved', 'pending', 'consumed', 'expired'));

WITH ranked_active AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS active_rank
  FROM public.verification_attempts
  WHERE status IN ('reserved', 'pending')
)
UPDATE public.verification_attempts AS attempts
SET status = 'expired', updated_at = now()
FROM ranked_active
WHERE attempts.id = ranked_active.id
  AND ranked_active.active_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_attempts_one_active_user
  ON public.verification_attempts(user_id)
  WHERE status IN ('reserved', 'pending');

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

REVOKE ALL ON TABLE public.saved_locations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_locations TO authenticated;
GRANT ALL ON TABLE public.saved_locations TO service_role;

REVOKE ALL ON TABLE public.volunteer_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.volunteer_preferences TO authenticated;
GRANT ALL ON TABLE public.volunteer_preferences TO service_role;

REVOKE ALL ON TABLE public.verification_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE public.verification_records FROM anon, authenticated;
GRANT SELECT ON TABLE public.verification_attempts TO authenticated;
GRANT SELECT ON TABLE public.verification_records TO authenticated;
GRANT ALL ON TABLE public.verification_attempts TO service_role;
GRANT ALL ON TABLE public.verification_records TO service_role;

CREATE OR REPLACE FUNCTION internal.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION internal.is_admin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.is_admin() TO authenticated;

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

  v_is_verified := p_role = 'volunteer';
  v_verified_at := CASE WHEN v_is_verified THEN now() ELSE NULL END;

  INSERT INTO public.profiles (
    id,
    display_name,
    role,
    is_verified,
    verified_at
  )
  VALUES (
    p_user_id,
    btrim(p_display_name),
    p_role,
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

REVOKE ALL ON FUNCTION public.complete_onboarding_tx(uuid, text, text, text, text, numeric, numeric, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_tx(uuid, text, text, text, text, numeric, numeric, text, numeric)
  TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_verification_challenge(
  p_user_id uuid,
  p_phone text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.verification_attempts%ROWTYPE;
  v_user_hourly_count integer;
  v_phone_hourly_count integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  UPDATE public.verification_attempts
  SET status = 'expired', updated_at = now()
  WHERE user_id = p_user_id
    AND status IN ('reserved', 'pending')
    AND expires_at <= now();

  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
    AND status IN ('reserved', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_attempt.id,
      'state', CASE WHEN v_attempt.status = 'pending' THEN 'existing' ELSE 'in_progress' END,
      'request_id', v_attempt.request_id,
      'expires_at', v_attempt.expires_at,
      'resend_available_at', v_attempt.resend_available_at
    );
  END IF;

  SELECT count(*) INTO v_user_hourly_count
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND created_at > now() - interval '1 hour';

  IF v_user_hourly_count >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'HOURLY_LIMIT_EXCEEDED';
  END IF;

  SELECT count(*) INTO v_phone_hourly_count
  FROM public.verification_attempts
  WHERE phone = p_phone
    AND created_at > now() - interval '1 hour';

  IF v_phone_hourly_count >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PHONE_LIMIT_EXCEEDED';
  END IF;

  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND status IN ('reserved', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND
     AND (v_attempt.status = 'reserved' OR v_attempt.resend_available_at > now()) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'COOLDOWN_ACTIVE';
  END IF;

  UPDATE public.verification_attempts
  SET status = 'expired', updated_at = now()
  WHERE user_id = p_user_id
    AND status IN ('reserved', 'pending');

  INSERT INTO public.verification_attempts (
    user_id,
    phone,
    request_id,
    idempotency_key,
    status,
    expires_at,
    resend_available_at,
    attempts_count
  )
  VALUES (
    p_user_id,
    p_phone,
    'reserved:' || gen_random_uuid()::text,
    p_idempotency_key,
    'reserved',
    now() + interval '2 minutes',
    now() + interval '60 seconds',
    0
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'id', v_attempt.id,
    'state', 'reserved',
    'request_id', v_attempt.request_id,
    'expires_at', v_attempt.expires_at,
    'resend_available_at', v_attempt.resend_available_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_verification_challenge(
  p_user_id uuid,
  p_reservation_id uuid,
  p_request_id text,
  p_expires_in_seconds integer,
  p_resend_after_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.verification_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE id = p_reservation_id
    AND user_id = p_user_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  UPDATE public.verification_attempts
  SET
    request_id = p_request_id,
    status = 'pending',
    expires_at = now() + pg_catalog.make_interval(secs => p_expires_in_seconds),
    resend_available_at = now() + pg_catalog.make_interval(secs => p_resend_after_seconds),
    updated_at = now()
  WHERE id = p_reservation_id
  RETURNING * INTO v_attempt;

  RETURN to_jsonb(v_attempt);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_verification_reservation(
  p_user_id uuid,
  p_reservation_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH cancelled AS (
    UPDATE public.verification_attempts
    SET status = 'expired', updated_at = now()
    WHERE id = p_reservation_id
      AND user_id = p_user_id
      AND status = 'reserved'
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM cancelled);
$$;

CREATE OR REPLACE FUNCTION public.get_verification_challenge(
  p_user_id uuid,
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.verification_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND (p_request_id IS NULL OR request_id = p_request_id)
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_NOT_FOUND';
  END IF;

  IF v_attempt.status = 'consumed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_ALREADY_CONSUMED';
  END IF;

  IF v_attempt.status = 'reserved' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_NOT_READY';
  END IF;

  IF v_attempt.status = 'expired' OR v_attempt.expires_at <= now() THEN
    UPDATE public.verification_attempts
    SET status = 'expired', updated_at = now()
    WHERE id = v_attempt.id;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_EXPIRED';
  END IF;

  IF v_attempt.attempts_count >= 5 THEN
    UPDATE public.verification_attempts
    SET status = 'expired', updated_at = now()
    WHERE id = v_attempt.id;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MAX_ATTEMPTS_EXCEEDED';
  END IF;

  RETURN to_jsonb(v_attempt);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_verification_success(
  p_user_id uuid,
  p_request_id text,
  p_proof_id text,
  p_verified_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.verification_attempts%ROWTYPE;
  v_verified_at timestamptz := COALESCE(p_verified_at, now());
BEGIN
  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_ALREADY_CONSUMED';
  END IF;

  IF v_attempt.expires_at <= now() THEN
    UPDATE public.verification_attempts
    SET status = 'expired', updated_at = now()
    WHERE id = v_attempt.id;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_EXPIRED';
  END IF;

  UPDATE public.verification_attempts
  SET status = 'consumed', updated_at = now()
  WHERE id = v_attempt.id;

  INSERT INTO public.verification_records (
    user_id,
    phone,
    proof_id,
    status,
    verified_at
  )
  VALUES (
    p_user_id,
    v_attempt.phone,
    p_proof_id,
    'verified',
    v_verified_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    proof_id = EXCLUDED.proof_id,
    status = 'verified',
    verified_at = EXCLUDED.verified_at,
    updated_at = now();

  UPDATE public.profiles
  SET
    is_verified = true,
    phone = v_attempt.phone,
    verified_at = v_verified_at,
    updated_at = now()
  WHERE id = p_user_id
    AND role IN ('donor', 'requester');

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VERIFIABLE_PROFILE_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'verified', true,
    'phone', v_attempt.phone,
    'proof_id', p_proof_id,
    'verified_at', v_verified_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_verification_failure(
  p_user_id uuid,
  p_request_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.verification_attempts%ROWTYPE;
  v_attempts_count integer;
BEGIN
  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHALLENGE_NOT_FOUND';
  END IF;

  v_attempts_count := v_attempt.attempts_count + 1;

  UPDATE public.verification_attempts
  SET
    attempts_count = v_attempts_count,
    status = CASE WHEN v_attempts_count >= 5 THEN 'expired' ELSE 'pending' END,
    updated_at = now()
  WHERE id = v_attempt.id;

  RETURN jsonb_build_object(
    'attempts_count', v_attempts_count,
    'remaining_attempts', GREATEST(0, 5 - v_attempts_count),
    'status', CASE WHEN v_attempts_count >= 5 THEN 'locked' ELSE 'pending' END
  );
END;
$$;

DROP FUNCTION IF EXISTS public.bootstrap_admin_user(uuid, text, text);

CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(
  p_target_user_id uuid,
  p_display_name text DEFAULT 'System Administrator'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('annapurna-admin-bootstrap', 0)
  );

  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ADMIN_ALREADY_EXISTS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'USER_NOT_FOUND';
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    role,
    is_verified,
    verified_at
  )
  VALUES (
    p_target_user_id,
    COALESCE(NULLIF(btrim(p_display_name), ''), 'System Administrator'),
    'admin',
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = 'admin',
    is_verified = true,
    verified_at = now(),
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN to_jsonb(v_profile);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin_user(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(uuid, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.reserve_verification_challenge(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_verification_challenge(uuid, uuid, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_verification_reservation(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_verification_challenge(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_verification_success(uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_verification_failure(uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_verification_challenge(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_verification_challenge(uuid, uuid, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_verification_reservation(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_verification_challenge(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_verification_success(uuid, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_verification_failure(uuid, text) TO service_role;

DROP FUNCTION IF EXISTS internal.complete_onboarding_tx(uuid, text, text, text, text, numeric, numeric, text, numeric);
DROP FUNCTION IF EXISTS internal.create_verification_challenge(uuid, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS internal.consume_verification_success(uuid, text, text);
DROP FUNCTION IF EXISTS internal.record_verification_failure(uuid, text);

DROP FUNCTION IF EXISTS public.create_verification_challenge(uuid, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.consume_verification_success(uuid, text, text);

CREATE OR REPLACE FUNCTION public.protect_profile_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND CURRENT_USER <> 'service_role' THEN
    RAISE EXCEPTION 'User role is immutable and cannot be self-modified after onboarding';
  END IF;

  IF (
    NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
  ) AND CURRENT_USER <> 'service_role' THEN
    RAISE EXCEPTION 'Verification status can only be modified via verified server OTP flow';
  END IF;

  NEW.updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_row_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_row_timestamp() FROM PUBLIC, anon, authenticated;
