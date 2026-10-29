-- ============================================================================
-- Migration: 20261029000000_onboarding_foundation.sql
-- Description: Core Onboarding & Profile Foundation for Project Annapurna
-- Security: Strict RLS, non-recursive policies, admin protection, transactional onboarding
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create internal schema for non-exposed security helpers
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2 AND char_length(display_name) <= 100),
  role TEXT NOT NULL CHECK (role IN ('donor', 'requester', 'volunteer', 'admin')),
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Saved Locations Table (for user addresses & map pins)
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(trim(label)) >= 1 AND char_length(label) <= 100),
  address TEXT CHECK (address IS NULL OR char_length(address) <= 300),
  latitude NUMERIC NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude NUMERIC NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Volunteer Preferences Table (available only to volunteers)
CREATE TABLE IF NOT EXISTS public.volunteer_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT DEFAULT 'motorcycle' NOT NULL CHECK (vehicle_type IN ('foot', 'bicycle', 'motorcycle', 'car', 'van', 'other')),
  max_distance_km NUMERIC DEFAULT 10.0 NOT NULL CHECK (max_distance_km > 0 AND max_distance_km <= 100.0),
  is_available BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_default ON public.saved_locations(user_id) WHERE is_default = true;

-- 6. Non-recursive Admin Checker Helper
CREATE OR REPLACE FUNCTION internal.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION internal.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.is_admin() TO authenticated, service_role;

-- 7. Trigger Function: Protect Profile Immutability & Privileged Fields
CREATE OR REPLACE FUNCTION public.protect_profile_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prevent non-service-role callers from changing immutable role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
      RAISE EXCEPTION 'User role is immutable and cannot be self-modified after onboarding';
    END IF;
  END IF;

  -- Prevent clients from directly self-verifying; verification must occur via server OTP flow
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    IF current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
      RAISE EXCEPTION 'Verification status can only be modified via verified server OTP flow';
    END IF;
  END IF;

  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_immutability ON public.profiles;
CREATE TRIGGER trg_protect_profile_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_immutability();

-- 8. Trigger Function: Update Timestamps on Modified Tables
CREATE OR REPLACE FUNCTION public.update_row_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_locations_timestamp ON public.saved_locations;
CREATE TRIGGER trg_saved_locations_timestamp
  BEFORE UPDATE ON public.saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

DROP TRIGGER IF EXISTS trg_volunteer_preferences_timestamp ON public.volunteer_preferences;
CREATE TRIGGER trg_volunteer_preferences_timestamp
  BEFORE UPDATE ON public.volunteer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

-- 9. Enable Row-Level Security (RLS) on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_preferences ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies: Profiles (Non-recursive, consolidated)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()) OR internal.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (select auth.uid())
    AND role IN ('donor', 'requester', 'volunteer')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- 11. RLS Policies: Saved Locations
DROP POLICY IF EXISTS "saved_locations_select_own" ON public.saved_locations;
CREATE POLICY "saved_locations_select_own"
  ON public.saved_locations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR internal.is_admin());

DROP POLICY IF EXISTS "saved_locations_insert_own" ON public.saved_locations;
CREATE POLICY "saved_locations_insert_own"
  ON public.saved_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "saved_locations_update_own" ON public.saved_locations;
CREATE POLICY "saved_locations_update_own"
  ON public.saved_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "saved_locations_delete_own" ON public.saved_locations;
CREATE POLICY "saved_locations_delete_own"
  ON public.saved_locations
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 12. RLS Policies: Volunteer Preferences
DROP POLICY IF EXISTS "volunteer_preferences_select_own" ON public.volunteer_preferences;
CREATE POLICY "volunteer_preferences_select_own"
  ON public.volunteer_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR internal.is_admin());

DROP POLICY IF EXISTS "volunteer_preferences_insert_own" ON public.volunteer_preferences;
CREATE POLICY "volunteer_preferences_insert_own"
  ON public.volunteer_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "volunteer_preferences_update_own" ON public.volunteer_preferences;
CREATE POLICY "volunteer_preferences_update_own"
  ON public.volunteer_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "volunteer_preferences_delete_own" ON public.volunteer_preferences;
CREATE POLICY "volunteer_preferences_delete_own"
  ON public.volunteer_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 13. Backwards-Compatible Views (Security Invoker, safe table drop guard)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP VIEW IF EXISTS public.users;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE VIEW public.users
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.display_name AS name,
    p.phone,
    p.role,
    0 AS earnings,
    p.created_at
  FROM public.profiles p;

-- 14. Secure Admin Bootstrap Function with One-Time Lockout
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(
  target_user_id UUID,
  bootstrap_secret TEXT,
  expected_secret_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID must be provided';
  END IF;

  IF bootstrap_secret IS NULL OR length(bootstrap_secret) < 16 THEN
    RAISE EXCEPTION 'Invalid admin bootstrap secret provided';
  END IF;

  -- Validate secret hash match
  IF encode(digest(bootstrap_secret, 'sha256'), 'hex') != expected_secret_hash THEN
    RAISE EXCEPTION 'Admin bootstrap authentication failed';
  END IF;

  -- One-time lockout: If an admin already exists, forbid repeated bootstrap!
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin user already exists. Initial bootstrap has already been completed.';
  END IF;

  -- Ensure target user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found in auth system';
  END IF;

  -- Upsert profile to admin
  INSERT INTO public.profiles (
    id,
    display_name,
    role,
    is_verified,
    verified_at,
    created_at,
    updated_at
  )
  VALUES (
    target_user_id,
    'System Administrator',
    'admin',
    true,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_verified = true,
    verified_at = now(),
    updated_at = now();

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID, TEXT, TEXT) TO service_role;

-- 15. Transactional Onboarding Procedure (Non-exposed schema)
CREATE OR REPLACE FUNCTION internal.complete_onboarding_tx(
  p_user_id UUID,
  p_display_name TEXT,
  p_role TEXT,
  p_location_label TEXT,
  p_address TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT 'motorcycle',
  p_max_distance_km NUMERIC DEFAULT 10.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_verified BOOLEAN;
  v_verified_at TIMESTAMPTZ;
  v_profile RECORD;
  v_location RECORD;
  v_pref RECORD;
BEGIN
  IF auth.uid() != p_user_id AND current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized onboarding creation';
  END IF;

  IF p_role NOT IN ('donor', 'requester', 'volunteer') THEN
    RAISE EXCEPTION 'Invalid role for onboarding: %', p_role;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile already exists for this account';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'A valid saved location is required for onboarding';
  END IF;

  IF p_latitude < -90.0 OR p_latitude > 90.0 OR p_longitude < -180.0 OR p_longitude > 180.0 THEN
    RAISE EXCEPTION 'Coordinates are out of bounds';
  END IF;

  v_is_verified := (p_role = 'volunteer');
  IF v_is_verified THEN
    v_verified_at := now();
  ELSE
    v_verified_at := NULL;
  END IF;

  INSERT INTO public.profiles (id, display_name, role, is_verified, verified_at, created_at, updated_at)
  VALUES (p_user_id, trim(p_display_name), p_role, v_is_verified, v_verified_at, now(), now())
  RETURNING * INTO v_profile;

  INSERT INTO public.saved_locations (user_id, label, address, latitude, longitude, is_default, created_at, updated_at)
  VALUES (p_user_id, COALESCE(NULLIF(trim(p_location_label), ''), 'Default Location'), p_address, p_latitude, p_longitude, true, now(), now())
  RETURNING * INTO v_location;

  IF p_role = 'volunteer' THEN
    INSERT INTO public.volunteer_preferences (user_id, vehicle_type, max_distance_km, is_available, created_at, updated_at)
    VALUES (p_user_id, COALESCE(p_vehicle_type, 'motorcycle'), COALESCE(p_max_distance_km, 10.0), true, now(), now())
    RETURNING * INTO v_pref;
  END IF;

  RETURN jsonb_build_object(
    'profile', row_to_json(v_profile),
    'location', row_to_json(v_location),
    'volunteer_preferences', CASE WHEN p_role = 'volunteer' THEN row_to_json(v_pref) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION internal.complete_onboarding_tx(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC) TO authenticated, service_role;

-- 16. Durable OTP Challenge & Consumption Procedures (Non-exposed schema)
CREATE OR REPLACE FUNCTION internal.create_verification_challenge(
  p_user_id UUID,
  p_phone TEXT,
  p_request_id TEXT,
  p_idempotency_key TEXT,
  p_expires_in_seconds INT DEFAULT 600,
  p_resend_cooldown_seconds INT DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_hourly_count INT;
  v_phone_hourly_count INT;
  v_existing_active RECORD;
  v_new_attempt RECORD;
BEGIN
  IF auth.uid() != p_user_id AND current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized verification challenge creation';
  END IF;

  SELECT * INTO v_existing_active
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing_active.id,
      'request_id', v_existing_active.request_id,
      'status', 'idempotent_existing',
      'resend_available_at', v_existing_active.resend_available_at,
      'expires_at', v_existing_active.expires_at
    );
  END IF;

  SELECT COUNT(*) INTO v_user_hourly_count
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND created_at > (now() - interval '1 hour');

  IF v_user_hourly_count >= 5 THEN
    RAISE EXCEPTION 'Hourly verification attempt limit reached for this account';
  END IF;

  SELECT COUNT(*) INTO v_phone_hourly_count
  FROM public.verification_attempts
  WHERE phone = p_phone
    AND created_at > (now() - interval '1 hour');

  IF v_phone_hourly_count >= 5 THEN
    RAISE EXCEPTION 'Hourly verification attempt limit reached for this phone number';
  END IF;

  SELECT * INTO v_existing_active
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND resend_available_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Resend cooldown active. Please wait before requesting another code.';
  END IF;

  UPDATE public.verification_attempts
  SET status = 'expired', updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  INSERT INTO public.verification_attempts (
    user_id,
    phone,
    request_id,
    idempotency_key,
    status,
    expires_at,
    resend_available_at,
    attempts_count,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_phone,
    p_request_id,
    p_idempotency_key,
    'pending',
    now() + (p_expires_in_seconds || ' seconds')::interval,
    now() + (p_resend_cooldown_seconds || ' seconds')::interval,
    0,
    now(),
    now()
  )
  RETURNING * INTO v_new_attempt;

  RETURN jsonb_build_object(
    'id', v_new_attempt.id,
    'request_id', v_new_attempt.request_id,
    'status', 'created',
    'resend_available_at', v_new_attempt.resend_available_at,
    'expires_at', v_new_attempt.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION internal.create_verification_challenge(UUID, TEXT, TEXT, TEXT, INT, INT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION internal.consume_verification_success(
  p_user_id UUID,
  p_request_id TEXT,
  p_proof_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt RECORD;
  v_phone TEXT;
BEGIN
  IF auth.uid() != p_user_id AND current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized verification consumption';
  END IF;

  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No matching pending verification attempt found';
  END IF;

  IF v_attempt.expires_at <= now() THEN
    UPDATE public.verification_attempts
    SET status = 'expired', updated_at = now()
    WHERE id = v_attempt.id;
    RAISE EXCEPTION 'Verification challenge has expired';
  END IF;

  v_phone := v_attempt.phone;

  UPDATE public.verification_attempts
  SET status = 'consumed', updated_at = now()
  WHERE id = v_attempt.id;

  INSERT INTO public.verification_records (
    user_id,
    phone,
    proof_id,
    status,
    verified_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_phone,
    p_proof_id,
    'verified',
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    proof_id = EXCLUDED.proof_id,
    status = 'verified',
    verified_at = now(),
    updated_at = now();

  UPDATE public.profiles
  SET
    is_verified = true,
    phone = v_phone,
    verified_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'phone', v_phone,
    'proof_id', p_proof_id,
    'verified_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION internal.consume_verification_success(UUID, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION internal.record_verification_failure(
  p_user_id UUID,
  p_request_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt RECORD;
  v_new_count INT;
BEGIN
  IF auth.uid() != p_user_id AND current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized verification update';
  END IF;

  SELECT * INTO v_attempt
  FROM public.verification_attempts
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No matching pending verification attempt found';
  END IF;

  v_new_count := v_attempt.attempts_count + 1;

  IF v_new_count >= 5 THEN
    UPDATE public.verification_attempts
    SET attempts_count = v_new_count, status = 'expired', updated_at = now()
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
      'attempts_count', v_new_count,
      'remaining_attempts', 0,
      'status', 'locked'
    );
  ELSE
    UPDATE public.verification_attempts
    SET attempts_count = v_new_count, updated_at = now()
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
      'attempts_count', v_new_count,
      'remaining_attempts', 5 - v_new_count,
      'status', 'pending'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION internal.record_verification_failure(UUID, TEXT) TO authenticated, service_role;
