BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(23);

SELECT has_table('public', 'workflow_idempotency', 'workflow idempotency table exists');
SELECT has_table('public', 'delivery_qc', 'delivery QC table exists');
SELECT has_table('public', 'delivery_locations', 'delivery locations table exists');
SELECT has_table('public', 'delivery_route_cache', 'persisted route cache table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.delivery_qc'::regclass), 'QC RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.delivery_locations'::regclass), 'location RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.delivery_route_cache'::regclass), 'route cache RLS enabled');
SELECT ok(NOT has_table_privilege('anon', 'public.delivery_qc', 'SELECT'), 'anon cannot read QC');
SELECT ok(NOT has_table_privilege('anon', 'public.delivery_locations', 'SELECT'), 'anon cannot read tracking');
SELECT ok(NOT has_table_privilege('anon', 'public.delivery_route_cache', 'SELECT'), 'anon cannot read routes');
SELECT ok(has_function_privilege('service_role', 'public.transition_delivery(uuid,uuid,text,jsonb,text,integer)', 'EXECUTE'), 'service role executes transitions');
SELECT ok(NOT has_function_privilege('authenticated', 'public.transition_delivery(uuid,uuid,text,jsonb,text,integer)', 'EXECUTE'), 'authenticated cannot call privileged transition directly');
SELECT ok(has_function_privilege('service_role', 'public.record_delivery_location(uuid,uuid,numeric,numeric,numeric,timestamptz,bigint)', 'EXECUTE'), 'service role records location');
SELECT ok(NOT has_function_privilege('authenticated', 'public.record_delivery_location(uuid,uuid,numeric,numeric,numeric,timestamptz,bigint)', 'EXECUTE'), 'authenticated cannot call privileged tracking directly');

INSERT INTO auth.users (id, email) VALUES
  ('71000000-0000-4000-8000-000000000001', 'lifecycle-donor@example.test'),
  ('71000000-0000-4000-8000-000000000002', 'lifecycle-requester@example.test'),
  ('71000000-0000-4000-8000-000000000003', 'lifecycle-volunteer@example.test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, display_name, role, is_verified) VALUES
  ('71000000-0000-4000-8000-000000000001', 'Lifecycle Donor', 'donor', true),
  ('71000000-0000-4000-8000-000000000002', 'Lifecycle Requester', 'requester', true),
  ('71000000-0000-4000-8000-000000000003', 'Lifecycle Volunteer', 'volunteer', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.food_listings (id, donor_id, title, quantity, unit, food_type, status, expires_at)
VALUES ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Lifecycle Meals', 10, 'meals', 'veg', 'in_delivery', now() + interval '2 hours');
INSERT INTO public.claims (id, listing_id, requester_id, status, dropoff_address, dropoff_area, dropoff_latitude, dropoff_longitude, dropoff_contact_phone)
VALUES ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'active', 'Private Recipient Address', 'Recipient Area', 19.08, 72.88, '+919000000002');
INSERT INTO public.deliveries (id, listing_id, claim_id, donor_id, requester_id, volunteer_id, status, assigned_at)
VALUES ('74000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'assigned', now());

SET LOCAL ROLE service_role;
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','arrive_pickup','{}','arrive-key-001',1))->>'status', 'at_pickup', 'volunteer arrives at pickup');
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','qc','{"result":"pass","notes":"safe"}','qc-pass-key-001',2))->>'status', 'qc_passed', 'QC pass recorded');
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','collect','{}','collect-key-001',3))->>'status', 'collected', 'food collected');
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','start_dropoff','{}','dropoff-key-001',4))->>'status', 'en_route_dropoff', 'dropoff started');
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','handover','{"evidence":{"acknowledged":true}}','handover-key-001',5))->>'status', 'handed_over', 'handover recorded');
SELECT is((public.transition_delivery('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','confirm_receipt','{}','receipt-key-001',6))->>'status', 'receipt_confirmed', 'requester confirms receipt');
SELECT is((SELECT status FROM public.food_listings WHERE id = '72000000-0000-4000-8000-000000000001'), 'completed', 'listing completes with receipt');
SELECT is((SELECT status FROM public.claims WHERE id = '73000000-0000-4000-8000-000000000001'), 'fulfilled', 'claim is fulfilled');
SELECT throws_ok(
  $$SELECT public.record_delivery_location('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003',19.07,72.87,10,now(),1)$$,
  '42501', 'TRACKING_FORBIDDEN', 'tracking stops after terminal receipt confirmation'
);

SELECT * FROM finish();
ROLLBACK;
