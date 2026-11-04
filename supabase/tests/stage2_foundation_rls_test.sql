BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(28);

INSERT INTO auth.users (id, email)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'other@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'admin@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'volunteer@example.test'),
  ('10000000-0000-4000-8000-000000000005', 'bootstrap-loser@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role, is_verified)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Owner', 'donor', false),
  ('10000000-0000-4000-8000-000000000002', 'Other', 'requester', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.saved_locations (
  user_id,
  label,
  latitude,
  longitude,
  is_default
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Owner home', 19.07, 72.87, true),
  ('10000000-0000-4000-8000-000000000002', 'Other home', 19.08, 72.88, true);

INSERT INTO public.verification_attempts (
  user_id,
  phone,
  request_id,
  idempotency_key,
  status,
  expires_at,
  resend_available_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '+919000000001',
    'owner-request',
    'owner-key',
    'pending',
    now() + interval '10 minutes',
    now() + interval '1 minute'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '+919000000002',
    'other-request',
    'other-key',
    'pending',
    now() + interval '10 minutes',
    now() + interval '1 minute'
  );

INSERT INTO public.verification_records (user_id, phone, proof_id)
VALUES
  ('10000000-0000-4000-8000-000000000001', '+919000000001', 'owner-proof'),
  ('10000000-0000-4000-8000-000000000002', '+919000000002', 'other-proof');

SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.saved_locations'::regclass),
  'saved_locations has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.volunteer_preferences'::regclass),
  'volunteer_preferences has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.verification_attempts'::regclass),
  'verification_attempts has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.verification_records'::regclass),
  'verification_records has RLS enabled'
);

SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anon cannot select profiles'
);
SELECT ok(
  pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated users can select profiles through RLS'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.verification_attempts', 'UPDATE'),
  'authenticated users cannot mutate verification attempts directly'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.verification_records', 'INSERT'),
  'authenticated users cannot insert verification evidence directly'
);

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

SELECT results_eq(
  $$ SELECT id FROM public.profiles ORDER BY id $$,
  $$ VALUES ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an owner sees only their profile'
);
SELECT results_eq(
  $$ SELECT user_id FROM public.saved_locations ORDER BY user_id $$,
  $$ VALUES ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an owner sees only their location'
);
SELECT results_eq(
  $$ SELECT user_id FROM public.verification_attempts ORDER BY user_id $$,
  $$ VALUES ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an owner sees only their verification attempts'
);
SELECT results_eq(
  $$ SELECT user_id FROM public.verification_records ORDER BY user_id $$,
  $$ VALUES ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an owner sees only their verification record'
);
SELECT lives_ok(
  $$ UPDATE public.profiles SET display_name = 'Owner Updated' WHERE id = '10000000-0000-4000-8000-000000000001' $$,
  'an owner can update a non-privileged profile field'
);
SELECT throws_ok(
  $$ UPDATE public.profiles SET role = 'admin' WHERE id = '10000000-0000-4000-8000-000000000001' $$,
  'P0001',
  'User role is immutable and cannot be self-modified after onboarding',
  'an owner cannot escalate their role'
);

RESET ROLE;

SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'authenticated',
    'public.complete_onboarding_tx(uuid,text,text,text,text,numeric,numeric,text,numeric)',
    'EXECUTE'
  ),
  'authenticated users cannot execute the privileged onboarding transaction'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'authenticated',
    'public.reserve_verification_challenge(uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated users cannot reserve verification challenges directly'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'authenticated',
    'public.bootstrap_admin_user(uuid,text)',
    'EXECUTE'
  ),
  'authenticated users cannot execute admin bootstrap'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.complete_onboarding_tx(uuid,text,text,text,text,numeric,numeric,text,numeric)',
    'EXECUTE'
  ),
  'service role can execute the onboarding transaction'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.reserve_verification_challenge(uuid,text,text)',
    'EXECUTE'
  ),
  'service role can reserve verification challenges'
);
SELECT ok(
  'security_invoker=true' = ANY (
    SELECT unnest(reloptions)
    FROM pg_catalog.pg_class
    WHERE oid = 'public.users'::regclass
  ),
  'the compatibility users view runs as security invoker'
);

SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$
    SELECT public.complete_onboarding_tx(
      '10000000-0000-4000-8000-000000000004',
      'Volunteer',
      'volunteer',
      'Volunteer home',
      NULL,
      19.09,
      72.89,
      'bicycle',
      8
    )
  $$,
  'onboarding completes through one privileged transaction'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '10000000-0000-4000-8000-000000000004'
      AND role = 'volunteer'
      AND is_verified
  ),
  'transactional onboarding creates the canonical profile'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.saved_locations
    WHERE user_id = '10000000-0000-4000-8000-000000000004'
  ) AND EXISTS (
    SELECT 1 FROM public.volunteer_preferences
    WHERE user_id = '10000000-0000-4000-8000-000000000004'
  ),
  'transactional onboarding creates required dependent rows'
);
SELECT lives_ok(
  $$ SELECT public.bootstrap_admin_user('10000000-0000-4000-8000-000000000003', 'Administrator') $$,
  'the first admin bootstrap succeeds'
);
SELECT throws_ok(
  $$ SELECT public.bootstrap_admin_user('10000000-0000-4000-8000-000000000005', 'Second Administrator') $$,
  'P0001',
  'ADMIN_ALREADY_EXISTS',
  'a second admin bootstrap is rejected'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.profiles),
  4,
  'the admin can read every canonical profile through the non-recursive policy'
);
SELECT is(
  (SELECT count(*)::integer FROM public.saved_locations),
  3,
  'the admin can read every saved location'
);

SELECT * FROM finish();
ROLLBACK;
