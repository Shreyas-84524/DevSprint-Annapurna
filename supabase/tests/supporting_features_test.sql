BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(18);

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
SELECT ok(has_table_privilege('anon', 'public.contact_messages', 'INSERT'), 'anon can insert contact messages');
SELECT ok(NOT has_table_privilege('anon', 'public.notifications', 'SELECT'), 'anon cannot select notifications');
SELECT ok(has_table_privilege('authenticated', 'public.notifications', 'SELECT'), 'authenticated can select notifications');
SELECT ok(has_table_privilege('authenticated', 'public.notifications', 'UPDATE'), 'authenticated can update notifications');

SELECT * FROM finish();
ROLLBACK;
