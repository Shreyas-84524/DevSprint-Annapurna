-- ============================================================================
-- Test Suite: 00001_onboarding_and_authz.sql
-- Description: pgTAP database tests for schema, RLS policies, and functions
-- ============================================================================

BEGIN;

SELECT plan(22);

-- 1. Structural Checks
SELECT has_extension('pgcrypto', 'Extension pgcrypto exists');
SELECT has_schema('internal', 'Schema internal exists');
SELECT has_table('public', 'profiles', 'Table public.profiles exists');
SELECT has_table('public', 'saved_locations', 'Table public.saved_locations exists');
SELECT has_table('public', 'volunteer_preferences', 'Table public.volunteer_preferences exists');
SELECT has_table('public', 'verification_records', 'Table public.verification_records exists');
SELECT has_table('public', 'verification_attempts', 'Table public.verification_attempts exists');
SELECT has_view('public', 'users', 'View public.users exists');

-- 2. RLS Status Checks
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  'public.profiles has Row Level Security enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.saved_locations'::regclass),
  'public.saved_locations has Row Level Security enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.volunteer_preferences'::regclass),
  'public.volunteer_preferences has Row Level Security enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.verification_records'::regclass),
  'public.verification_records has Row Level Security enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.verification_attempts'::regclass),
  'public.verification_attempts has Row Level Security enabled'
);

-- 3. Function Signatures & Search Path Invariants
SELECT has_function('internal', 'is_admin', ARRAY[]::text[], 'Function internal.is_admin() exists');
SELECT has_function('public', 'bootstrap_admin_user', ARRAY['uuid', 'text', 'text'], 'Function public.bootstrap_admin_user exists');
SELECT has_function('public', 'complete_onboarding_tx', ARRAY['uuid', 'text', 'text', 'text', 'text', 'numeric', 'numeric', 'text', 'numeric'], 'Function public.complete_onboarding_tx exists');
SELECT has_function('public', 'create_verification_challenge', ARRAY['uuid', 'text', 'text', 'text', 'integer', 'integer'], 'Function public.create_verification_challenge exists');
SELECT has_function('public', 'consume_verification_success', ARRAY['uuid', 'text', 'text'], 'Function public.consume_verification_success exists');
SELECT has_function('public', 'record_verification_failure', ARRAY['uuid', 'text'], 'Function public.record_verification_failure exists');

-- 4. Verify Pinned Search Path ('') for Security Definer Functions
SELECT is(
  (SELECT proconfig FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'internal'::regnamespace),
  ARRAY['search_path='],
  'internal.is_admin has pinned empty search_path'
);

SELECT is(
  (SELECT proconfig FROM pg_proc WHERE proname = 'bootstrap_admin_user' AND pronamespace = 'public'::regnamespace),
  ARRAY['search_path='],
  'public.bootstrap_admin_user has pinned empty search_path'
);

SELECT is(
  (SELECT proconfig FROM pg_proc WHERE proname = 'complete_onboarding_tx' AND pronamespace = 'public'::regnamespace),
  ARRAY['search_path='],
  'public.complete_onboarding_tx has pinned empty search_path'
);

SELECT * FROM finish();

ROLLBACK;
