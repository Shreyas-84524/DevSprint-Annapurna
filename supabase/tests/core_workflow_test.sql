BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(39);

-- Fixture Users
INSERT INTO auth.users (id, email)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'donor@example.test'),
  ('20000000-0000-4000-8000-000000000002', 'requester1@example.test'),
  ('20000000-0000-4000-8000-000000000003', 'requester2@example.test'),
  ('20000000-0000-4000-8000-000000000004', 'volunteer1@example.test'),
  ('20000000-0000-4000-8000-000000000005', 'volunteer2@example.test'),
  ('20000000-0000-4000-8000-000000000006', 'admin@example.test')
ON CONFLICT (id) DO NOTHING;

-- Fixture Profiles
INSERT INTO public.profiles (id, display_name, role, is_verified)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Verified Donor', 'donor', true),
  ('20000000-0000-4000-8000-000000000002', 'Verified Requester 1', 'requester', true),
  ('20000000-0000-4000-8000-000000000003', 'Verified Requester 2', 'requester', true),
  ('20000000-0000-4000-8000-000000000004', 'Volunteer 1', 'volunteer', true),
  ('20000000-0000-4000-8000-000000000005', 'Volunteer 2', 'volunteer', true),
  ('20000000-0000-4000-8000-000000000006', 'Admin User', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- Fixture Saved Locations
INSERT INTO public.saved_locations (id, user_id, label, address, latitude, longitude, is_default)
VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Donor Kitchen', '123 MG Road, Mumbai', 19.0760, 72.8777, true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Community Center', '456 Hill Road, Bandra', 19.0544, 72.8402, true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Shelter Home', '789 Link Road, Andheri', 19.1197, 72.8468, true)
ON CONFLICT (id) DO NOTHING;

-- 1-6. Table Existence Checks
SELECT has_table('public', 'food_listings', 'food_listings table exists');
SELECT has_table('public', 'listing_pickup_details', 'listing_pickup_details table exists');
SELECT has_table('public', 'listing_images', 'listing_images table exists');
SELECT has_table('public', 'claims', 'claims table exists');
SELECT has_table('public', 'deliveries', 'deliveries table exists');
SELECT has_table('public', 'delivery_events', 'delivery_events table exists');

-- 7-12. RLS Enablement Checks
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.food_listings'::regclass),
  'food_listings has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.listing_pickup_details'::regclass),
  'listing_pickup_details has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.listing_images'::regclass),
  'listing_images has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.claims'::regclass),
  'claims has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.deliveries'::regclass),
  'deliveries has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.delivery_events'::regclass),
  'delivery_events has RLS enabled'
);

-- 13-20. Privilege Revocations & Grants Checks
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.listing_pickup_details', 'SELECT'),
  'anon cannot select listing_pickup_details'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.claims', 'SELECT'),
  'anon cannot select claims'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.deliveries', 'SELECT'),
  'anon cannot select deliveries'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.delivery_events', 'SELECT'),
  'anon cannot select delivery_events'
);
SELECT ok(
  pg_catalog.has_table_privilege('anon', 'public.food_listings', 'SELECT'),
  'anon can select food_listings'
);
SELECT ok(
  pg_catalog.has_table_privilege('anon', 'public.listing_images', 'SELECT'),
  'anon can select listing_images'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.delivery_events', 'UPDATE'),
  'authenticated users cannot update delivery_events (append-only)'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.delivery_events', 'DELETE'),
  'authenticated users cannot delete delivery_events (append-only)'
);

-- 21-23. Schema Check Constraints
-- The image constraint fixtures need a valid parent row so the intended check
-- constraint, rather than the foreign key, is the first failing condition.
INSERT INTO public.food_listings (
  id, donor_id, title, quantity, unit, food_type, status, expires_at, general_area
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Fresh Dal Rice', 15, 'meals', 'veg', 'published',
  now() + interval '3 hours', 'Dadar West'
) ON CONFLICT (id) DO NOTHING;

SELECT throws_ok(
  $$
    INSERT INTO public.food_listings (
      donor_id, title, description, quantity, unit, food_type, status, expires_at
    ) VALUES (
      '20000000-0000-4000-8000-000000000001', 'Test Food', 'Description', 0, 'meals', 'veg', 'draft', now() + interval '2 hours'
    )
  $$,
  '23514',
  NULL,
  'quantity must be strictly positive'
);

SELECT throws_ok(
  $$
    INSERT INTO public.listing_images (
      listing_id, storage_path, file_name, file_size_bytes, mime_type
    ) VALUES (
      '40000000-0000-4000-8000-000000000001', 'path/test.exe', 'test.exe', 1024, 'application/octet-stream'
    )
  $$,
  '23514',
  NULL,
  'invalid mime type rejected'
);

SELECT throws_ok(
  $$
    INSERT INTO public.listing_images (
      listing_id, storage_path, file_name, file_size_bytes, mime_type
    ) VALUES (
      '40000000-0000-4000-8000-000000000001', 'path/test.jpg', 'test.jpg', 6000000, 'image/jpeg'
    )
  $$,
  '23514',
  NULL,
  'image file size > 5MB rejected'
);

-- Seed published listing with private pickup details
INSERT INTO public.food_listings (
  id, donor_id, title, description, quantity, unit, food_type, status, expires_at, general_area
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Fresh Dal Rice',
  'Freshly packed vegetarian meals',
  15,
  'meals',
  'veg',
  'published',
  now() + interval '3 hours',
  'Dadar West'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.listing_pickup_details (
  listing_id, pickup_address, latitude, longitude, contact_phone, pickup_instructions
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  'Flat 402, Sunshine Towers, Dadar West, Mumbai',
  19.0178,
  72.8478,
  '+919876543210',
  'Ring doorbell twice and ask for Sunil'
) ON CONFLICT (listing_id) DO NOTHING;

-- 24-26. RLS Privacy Boundary Checks (Before Claim)
-- Anon role sees 0 rows in listing_pickup_details
SET LOCAL ROLE anon;
SELECT is_empty(
  'SELECT * FROM public.listing_pickup_details',
  'anon sees zero rows in listing_pickup_details'
);

-- Other Requester sees 0 rows in listing_pickup_details for published unclaimed listing
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT is_empty(
  'SELECT * FROM public.listing_pickup_details WHERE listing_id = ''40000000-0000-4000-8000-000000000001''',
  'unclaimed listing pickup details hidden from other requesters'
);

-- Donor can see their own pickup details
SELECT pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT results_eq(
  'SELECT pickup_address FROM public.listing_pickup_details WHERE listing_id = ''40000000-0000-4000-8000-000000000001''',
  ARRAY['Flat 402, Sunshine Towers, Dadar West, Mumbai'],
  'donor can view their own private pickup details'
);

-- 27-28. Partial Unique Index Checks
RESET ROLE;
SELECT has_index('public', 'claims', 'idx_claims_one_active_listing', 'idx_claims_one_active_listing exists');
SELECT has_index('public', 'deliveries', 'idx_deliveries_one_active_volunteer', 'idx_deliveries_one_active_volunteer exists');

-- 29-30. Partial Unique Constraint Invariants
SELECT throws_ok(
  $$
    INSERT INTO public.claims (listing_id, requester_id, status, dropoff_address, dropoff_latitude, dropoff_longitude, dropoff_contact_phone)
    VALUES
      ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'active', 'Address 1', 19.0, 72.8, '+919000000001'),
      ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'active', 'Address 2', 19.1, 72.9, '+919000000002')
  $$,
  '23505',
  NULL,
  'idx_claims_one_active_listing blocks concurrent active claims on same listing'
);

-- Clean up any test claims before procedure tests
DELETE FROM public.claims WHERE listing_id = '40000000-0000-4000-8000-000000000001';

-- Seed expired listing for expiry test
INSERT INTO public.food_listings (
  id, donor_id, title, description, quantity, unit, food_type, status, expires_at, general_area
) VALUES (
  '40000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'Expired Rice',
  'Expired description',
  5,
  'meals',
  'veg',
  'published',
  now() - interval '10 minutes',
  'Dadar West'
) ON CONFLICT (id) DO NOTHING;

-- 31-34. Atomic Stored Procedure: claim_food_listing
SET LOCAL ROLE service_role;

-- 31: Claim creation succeeds
SELECT ok(
  ((public.claim_food_listing(
    '40000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '30000000-0000-4000-8000-000000000002'::uuid,
    'claim-idemp-001'
  ))->>'success')::boolean,
  'claim_food_listing successfully claims published listing'
);

-- 32: Idempotent replay returns existing claim
SELECT is(
  (public.claim_food_listing(
    '40000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '30000000-0000-4000-8000-000000000002'::uuid,
    'claim-idemp-001'
  ))->>'status',
  'replayed',
  'claim_food_listing with same idempotency key returns replayed status'
);

-- 33: Competing claim fails with error
SELECT throws_ok(
  $$
    SELECT public.claim_food_listing(
      '40000000-0000-4000-8000-000000000001'::uuid,
      '20000000-0000-4000-8000-000000000003'::uuid,
      '30000000-0000-4000-8000-000000000003'::uuid,
      'competing-claim-001'
    )
  $$,
  'P0001',
  'LISTING_ALREADY_CLAIMED',
  'claim_food_listing rejects claim on already claimed listing'
);

-- 34: Expired listing claim fails with error
SELECT throws_ok(
  $$
    SELECT public.claim_food_listing(
      '40000000-0000-4000-8000-000000000002'::uuid,
      '20000000-0000-4000-8000-000000000002'::uuid,
      '30000000-0000-4000-8000-000000000002'::uuid,
      'claim-expired-001'
    )
  $$,
  'P0001',
  'LISTING_EXPIRED',
  'claim_food_listing rejects claim on expired listing'
);

-- 35. RLS Privacy Check: Claimant now sees pickup details
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT results_eq(
  'SELECT pickup_address FROM public.listing_pickup_details WHERE listing_id = ''40000000-0000-4000-8000-000000000001''',
  ARRAY['Flat 402, Sunshine Towers, Dadar West, Mumbai'],
  'active claimant can view private pickup details'
);

-- 36-38. Atomic Stored Procedure: accept_delivery_task
RESET ROLE;
SET LOCAL ROLE service_role;

SELECT ok(
  ((public.accept_delivery_task(
    (SELECT id FROM public.deliveries WHERE listing_id = '40000000-0000-4000-8000-000000000001' LIMIT 1),
    '20000000-0000-4000-8000-000000000004'::uuid,
    'accept-idemp-001'
  ))->>'success')::boolean,
  'accept_delivery_task successfully assigns volunteer'
);

-- 37: Replay returns replayed status
SELECT is(
  (public.accept_delivery_task(
    (SELECT id FROM public.deliveries WHERE listing_id = '40000000-0000-4000-8000-000000000001' LIMIT 1),
    '20000000-0000-4000-8000-000000000004'::uuid,
    'accept-idemp-001'
  ))->>'status',
  'assigned',
  'accept_delivery_task returns assigned status on replay'
);

-- 38: Volunteer with existing active delivery cannot accept another task
-- Create second awaiting delivery
INSERT INTO public.food_listings (
  id, donor_id, title, description, quantity, unit, food_type, status, expires_at, general_area
) VALUES (
  '40000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  'Second Food Listing',
  'Another meal',
  10,
  'meals',
  'veg',
  'claimed',
  now() + interval '3 hours',
  'Dadar'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claims (
  id, listing_id, requester_id, status, dropoff_address, dropoff_latitude, dropoff_longitude, dropoff_contact_phone
) VALUES (
  '50000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000003',
  'active',
  'Second Address',
  19.1,
  72.8,
  '+919000000003'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.deliveries (
  id, listing_id, claim_id, donor_id, requester_id, status
) VALUES (
  '60000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003',
  'awaiting_volunteer'
) ON CONFLICT (id) DO NOTHING;

SELECT throws_ok(
  $$
    SELECT public.accept_delivery_task(
      '60000000-0000-4000-8000-000000000002'::uuid,
      '20000000-0000-4000-8000-000000000004'::uuid,
      'accept-second-001'
    )
  $$,
  'P0001',
  'VOLUNTEER_ACTIVE_DELIVERY_EXISTS',
  'accept_delivery_task enforces single active delivery per volunteer'
);

-- 39-40. Assigned Volunteer vs Unassigned Volunteer RLS Privacy
SET LOCAL ROLE authenticated;
-- Assigned volunteer can view pickup details
SELECT pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
SELECT results_eq(
  'SELECT pickup_address FROM public.listing_pickup_details WHERE listing_id = ''40000000-0000-4000-8000-000000000001''',
  ARRAY['Flat 402, Sunshine Towers, Dadar West, Mumbai'],
  'assigned volunteer can view private pickup details'
);

-- Unassigned volunteer cannot view pickup details
SELECT pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);
SELECT is_empty(
  'SELECT * FROM public.listing_pickup_details WHERE listing_id = ''40000000-0000-4000-8000-000000000001''',
  'unassigned volunteer cannot view private pickup details'
);

SELECT * FROM finish();
ROLLBACK;
