BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES
  ('81000000-0000-4000-8000-000000000001', 'rls-donor@example.test'),
  ('81000000-0000-4000-8000-000000000002', 'rls-requester@example.test'),
  ('81000000-0000-4000-8000-000000000003', 'rls-volunteer@example.test'),
  ('81000000-0000-4000-8000-000000000004', 'rls-stranger@example.test'),
  ('81000000-0000-4000-8000-000000000005', 'rls-admin@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role, is_verified)
VALUES
  ('81000000-0000-4000-8000-000000000001', 'RLS Donor', 'donor', false),
  ('81000000-0000-4000-8000-000000000002', 'RLS Requester', 'requester', false),
  ('81000000-0000-4000-8000-000000000003', 'RLS Volunteer', 'volunteer', false),
  ('81000000-0000-4000-8000-000000000004', 'RLS Stranger', 'requester', false),
  ('81000000-0000-4000-8000-000000000005', 'RLS Admin', 'admin', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_listings (
  id, donor_id, title, quantity, unit, food_type, status, expires_at
) VALUES (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'RLS Cycle Fixture', 10, 'meals', 'veg', 'claimed', now() + interval '3 hours'
);

INSERT INTO public.claims (
  id, listing_id, requester_id, status, dropoff_address,
  dropoff_latitude, dropoff_longitude, dropoff_contact_phone
) VALUES (
  '83000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  'active', 'RLS Requester Address', 19.0760, 72.8777, '+919000000002'
);

INSERT INTO public.deliveries (
  id, listing_id, claim_id, donor_id, requester_id, volunteer_id, status
) VALUES (
  '84000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  'assigned'
);

SELECT has_function('internal', 'has_canonical_role', ARRAY['text']);
SELECT has_function('internal', 'can_read_food_listing', ARRAY['uuid']);
SELECT has_function('internal', 'can_read_claim', ARRAY['uuid']);
SELECT ok(
  NOT pg_catalog.has_function_privilege('anon', 'internal.can_read_food_listing(uuid)', 'EXECUTE'),
  'anonymous callers cannot execute the participant helper'
);
SELECT ok(
  pg_catalog.has_function_privilege('authenticated', 'internal.can_read_food_listing(uuid)', 'EXECUTE'),
  'authenticated callers can execute the participant helper used by RLS'
);

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
SELECT results_eq(
  $$ SELECT id::text FROM public.food_listings WHERE id = '82000000-0000-4000-8000-000000000001' $$,
  ARRAY['82000000-0000-4000-8000-000000000001'],
  'donor reads the owned listing without recursive policy evaluation'
);
SELECT results_eq(
  $$ SELECT id::text FROM public.claims WHERE id = '83000000-0000-4000-8000-000000000001' $$,
  ARRAY['83000000-0000-4000-8000-000000000001'],
  'donor reads the related claim without recursive policy evaluation'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
SELECT results_eq(
  $$ SELECT id::text FROM public.food_listings WHERE id = '82000000-0000-4000-8000-000000000001' $$,
  ARRAY['82000000-0000-4000-8000-000000000001'],
  'requester reads the claimed listing without recursive policy evaluation'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
SELECT results_eq(
  $$ SELECT id::text FROM public.food_listings WHERE id = '82000000-0000-4000-8000-000000000001' $$,
  ARRAY['82000000-0000-4000-8000-000000000001'],
  'assigned volunteer reads the listing without recursive policy evaluation'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
SELECT is_empty(
  $$ SELECT id FROM public.food_listings WHERE id = '82000000-0000-4000-8000-000000000001' $$,
  'unrelated requester cannot read the listing'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
SELECT results_eq(
  $$ SELECT id::text FROM public.food_listings WHERE id = '82000000-0000-4000-8000-000000000001' $$,
  ARRAY['82000000-0000-4000-8000-000000000001'],
  'admin reads the listing through the participant helper'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
SELECT lives_ok(
  $$
    INSERT INTO public.food_listings (
      donor_id, title, quantity, unit, food_type, status, expires_at
    ) VALUES (
      '81000000-0000-4000-8000-000000000001',
      'Unverified Legacy Donor Listing', 2, 'meals', 'veg', 'draft', now() + interval '1 hour'
    )
  $$,
  'canonical donor insert is not gated by legacy is_verified status'
);

SELECT * FROM finish();
ROLLBACK;
