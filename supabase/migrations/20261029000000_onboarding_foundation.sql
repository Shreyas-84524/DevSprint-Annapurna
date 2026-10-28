-- ============================================================================
-- Migration: 20261029000000_onboarding_foundation.sql
-- Description: Core Onboarding & Profile Foundation for Project Annapurna
-- Security: Strict RLS, role immutability, admin protection, audit timestamps
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table
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

-- 2. Saved Locations Table (for user addresses & map pins)
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

-- 3. Volunteer Preferences Table (available only to volunteers)
CREATE TABLE IF NOT EXISTS public.volunteer_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT DEFAULT 'motorcycle' NOT NULL CHECK (vehicle_type IN ('foot', 'bicycle', 'motorcycle', 'car', 'van', 'other')),
  max_distance_km NUMERIC DEFAULT 10.0 NOT NULL CHECK (max_distance_km > 0 AND max_distance_km <= 100.0),
  is_available BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_default ON public.saved_locations(user_id) WHERE is_default = true;

-- 5. Trigger Function: Protect Profile Immutability & Privileged Fields
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

CREATE OR REPLACE TRIGGER trg_protect_profile_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_immutability();

-- 6. Trigger Function: Update Timestamps on Modified Tables
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

CREATE OR REPLACE TRIGGER trg_saved_locations_timestamp
  BEFORE UPDATE ON public.saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

CREATE OR REPLACE TRIGGER trg_volunteer_preferences_timestamp
  BEFORE UPDATE ON public.volunteer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

-- 7. Enable Row-Level Security (RLS) on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_preferences ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: Profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = (select auth.uid())
      AND admin_profile.role = 'admin'
    )
  );

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (select auth.uid())
    AND role IN ('donor', 'requester', 'volunteer')
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (
    id = (select auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (select auth.uid()))
  );

-- 9. RLS Policies: Saved Locations
CREATE POLICY "saved_locations_select_own"
  ON public.saved_locations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "saved_locations_insert_own"
  ON public.saved_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "saved_locations_update_own"
  ON public.saved_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "saved_locations_delete_own"
  ON public.saved_locations
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 10. RLS Policies: Volunteer Preferences
CREATE POLICY "volunteer_preferences_select_own"
  ON public.volunteer_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "volunteer_preferences_insert_own"
  ON public.volunteer_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "volunteer_preferences_update_own"
  ON public.volunteer_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "volunteer_preferences_delete_own"
  ON public.volunteer_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 11. Backwards-Compatible Views (Security Invoker)
CREATE OR REPLACE VIEW public.users
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

-- 12. Secure Admin Bootstrap Function
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
  IF bootstrap_secret IS NULL OR length(bootstrap_secret) < 16 THEN
    RAISE EXCEPTION 'Invalid admin bootstrap secret provided';
  END IF;

  -- Validate secret hash match
  IF encode(digest(bootstrap_secret, 'sha256'), 'hex') != expected_secret_hash THEN
    RAISE EXCEPTION 'Admin bootstrap authentication failed';
  END IF;

  -- Ensure target user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found in auth system';
  END IF;

  -- Upsert profile to admin
  INSERT INTO public.profiles (id, display_name, role, is_verified, verified_at)
  VALUES (target_user_id, 'System Administrator', 'admin', true, now())
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_verified = true,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- Revoke public execution to ensure function cannot be accessed via anonymous REST RPC
REVOKE EXECUTE ON FUNCTION public.protect_profile_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_row_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID, TEXT, TEXT) TO service_role;

-- 13. Confirm User Phone Verified Function (Privileged Server-Only RPC)
CREATE OR REPLACE FUNCTION public.confirm_user_phone_verified(
  target_user_id UUID,
  verified_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() != target_user_id AND current_user != 'service_role' AND NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'Unauthorized verification update';
  END IF;

  UPDATE public.profiles
  SET
    is_verified = true,
    phone = verified_phone,
    verified_at = TIMEZONE('utc'::text, NOW()),
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_user_phone_verified(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_phone_verified(UUID, TEXT) TO service_role;

