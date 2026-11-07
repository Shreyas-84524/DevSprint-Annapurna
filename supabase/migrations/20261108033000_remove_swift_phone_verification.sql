-- Migration: 20261108033000_remove_swift_phone_verification.sql
-- Description: Replace phone verification with native Supabase email OTP.
--              Update complete_onboarding_tx to set is_verified = true for all completed onboarding profiles.
--              Drop obsolete Swift phone login challenges, rate limits, and helper RPCs.

-- 1. Update complete_onboarding_tx
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

  -- Users authenticated via passwordless email OTP who complete onboarding with base location are verified
  v_is_verified := true;
  v_verified_at := now();

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
    NULL,
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
    btrim(p_location_label),
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
    'volunteer_preferences', CASE WHEN p_role = 'volunteer' THEN to_jsonb(v_preferences) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding_tx(uuid, text, text, text, text, numeric, numeric, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_tx(uuid, text, text, text, text, numeric, numeric, text, numeric) TO authenticated, service_role;

-- 2. Clean up obsolete phone login public wrapper RPCs
DROP FUNCTION IF EXISTS public.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.claim_phone_login_challenge(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.consume_phone_login_challenge(UUID);

-- 3. Clean up obsolete phone login internal RPCs and tables
DROP FUNCTION IF EXISTS internal.record_phone_login_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS internal.claim_phone_login_challenge(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS internal.consume_phone_login_challenge(UUID);

DROP TABLE IF EXISTS internal.phone_login_challenges CASCADE;
DROP TABLE IF EXISTS internal.phone_login_rate_limits CASCADE;
