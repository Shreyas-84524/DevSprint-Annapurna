BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(33);

-- 1. Table existence
SELECT has_table('public', 'events', 'events table exists');
SELECT has_table('public', 'faqs', 'faqs table exists');
SELECT has_table('public', 'gallery', 'gallery table exists');
SELECT has_table('public', 'contact_messages', 'contact messages table exists');
SELECT has_table('public', 'notifications', 'notifications table exists');

-- 2. RLS enabled
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.events'::regclass), 'events RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.faqs'::regclass), 'faqs RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.gallery'::regclass), 'gallery RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.contact_messages'::regclass), 'contact messages RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notifications'::regclass), 'notifications RLS enabled');

-- 3. Grants & Privileges
SELECT ok(has_table_privilege('anon', 'public.events', 'SELECT'), 'anon can select events');
SELECT ok(has_table_privilege('anon', 'public.faqs', 'SELECT'), 'anon can select faqs');
SELECT ok(has_table_privilege('anon', 'public.gallery', 'SELECT'), 'anon can select gallery');
SELECT ok(NOT has_table_privilege('anon', 'public.contact_messages', 'SELECT'), 'anon cannot select contact messages');
SELECT ok(NOT has_table_privilege('anon', 'public.contact_messages', 'INSERT'), 'anon cannot bypass the contact API');
SELECT ok(NOT has_table_privilege('anon', 'public.notifications', 'SELECT'), 'anon cannot select notifications');
SELECT ok(NOT has_table_privilege('authenticated', 'public.notifications', 'SELECT'), 'authenticated users read notifications through the authorized API');
SELECT ok(NOT has_table_privilege('authenticated', 'public.notifications', 'UPDATE'), 'authenticated users update notifications through the authorized API');

-- 4. Publication boundaries and hardened direct access
SELECT has_column('public', 'events', 'is_published', 'events have a publication boundary');
SELECT has_column('public', 'faqs', 'is_published', 'faqs have a publication boundary');
SELECT has_column('public', 'gallery', 'is_published', 'gallery has a publication boundary');
SELECT ok(NOT has_table_privilege('anon', 'public.contact_inquiries', 'INSERT'), 'legacy contact inserts are disabled');
SELECT ok(NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT'), 'clients cannot forge workflow notifications');
SELECT ok(
  has_function_privilege('service_role', 'public.submit_contact_message(text,text,text,text,text)', 'EXECUTE'),
  'service role can execute durable contact submission'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.submit_contact_message(text,text,text,text,text)', 'EXECUTE'),
  'anon cannot execute the privileged contact function directly'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.submit_contact_message(text,text,text,text,text)', 'EXECUTE'),
  'authenticated clients cannot execute the privileged contact function directly'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cms_assets_storage_select'
  ),
  'public bucket objects cannot be enumerated through a broad select policy'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_link_safe'
      AND contype = 'c'
  ),
  'notification links are constrained to relative application paths'
);
SELECT has_index('public', 'events', 'idx_events_public_date', 'published events are indexed');
SELECT has_index('public', 'faqs', 'idx_faqs_public_order', 'published FAQs are indexed');
SELECT has_index('public', 'gallery', 'idx_gallery_public_created', 'published gallery items are indexed');

INSERT INTO public.events (id, title, description, date, location, is_published)
VALUES
  ('51000000-0000-4000-8000-000000000001', 'Published event', 'Visible community event', now() + interval '1 day', 'Mumbai', true),
  ('51000000-0000-4000-8000-000000000002', 'Draft event', 'Hidden community event', now() + interval '2 days', 'Mumbai', false);
INSERT INTO public.faqs (id, question, answer, category, display_order, is_published)
VALUES
  ('52000000-0000-4000-8000-000000000001', 'Published question?', 'Published answer', 'General', 1, true),
  ('52000000-0000-4000-8000-000000000002', 'Draft question?', 'Draft answer', 'General', 2, false);
INSERT INTO public.gallery (id, title, image_url, is_published)
VALUES
  ('53000000-0000-4000-8000-000000000001', 'Published image', 'https://example.test/public.webp', true),
  ('53000000-0000-4000-8000-000000000002', 'Draft image', 'https://example.test/draft.webp', false);

SET LOCAL ROLE anon;
SELECT results_eq(
  $$ SELECT title FROM public.events ORDER BY title $$,
  $$ VALUES ('Published event'::text) $$,
  'anon sees only published events'
);
SELECT results_eq(
  $$ SELECT question FROM public.faqs ORDER BY question $$,
  $$ VALUES ('Published question?'::text) $$,
  'anon sees only published FAQs'
);
SELECT results_eq(
  $$ SELECT title FROM public.gallery ORDER BY title $$,
  $$ VALUES ('Published image'::text) $$,
  'anon sees only published gallery items'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$
    DO $rate_limit$
    BEGIN
      FOR i IN 1..5 LOOP
        PERFORM * FROM public.submit_contact_message(
          'Rate Test',
          'rate@example.test',
          NULL,
          'A valid contact message for the durable rate limiter.',
          repeat('a', 64)
        );
      END LOOP;
    END
    $rate_limit$
  $$,
  'five contact submissions are accepted in one durable window'
);
SELECT throws_ok(
  $$ SELECT * FROM public.submit_contact_message(
    'Rate Test',
    'rate@example.test',
    NULL,
    'The sixth contact message must be rejected by PostgreSQL.',
    repeat('a', 64)
  ) $$,
  'P0001',
  'CONTACT_RATE_LIMITED',
  'the sixth contact submission is rejected across server instances'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
