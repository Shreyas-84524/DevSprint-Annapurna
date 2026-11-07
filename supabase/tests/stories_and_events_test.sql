BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(14);

-- 1. Exactly 10 seeded stories exist
SELECT is(
  (SELECT count(*)::integer FROM public.blogs WHERE slug IN (
    'wedding-surplus-became-240-community-meals',
    'restaurants-nightly-food-rescue-routine',
    'college-volunteers-built-last-mile-meal-network',
    'family-donor-helped-nearby-shelter',
    'requesters-found-meals-without-losing-dignity',
    'volunteers-coordinated-during-heavy-rain',
    'corporate-cafeteria-surplus-supported-night-workers',
    'community-kitchens-reduced-weekend-food-waste',
    'safe-packaging-improved-successful-deliveries',
    'one-neighborhoods-journey-toward-zero-food-waste'
  )),
  10,
  'exactly 10 seeded stories exist without duplicates'
);

-- 2. All 10 seeded stories are published
SELECT is(
  (SELECT count(*)::integer FROM public.blogs WHERE status = 'published' AND slug IN (
    'wedding-surplus-became-240-community-meals',
    'restaurants-nightly-food-rescue-routine',
    'college-volunteers-built-last-mile-meal-network',
    'family-donor-helped-nearby-shelter',
    'requesters-found-meals-without-losing-dignity',
    'volunteers-coordinated-during-heavy-rain',
    'corporate-cafeteria-surplus-supported-night-workers',
    'community-kitchens-reduced-weekend-food-waste',
    'safe-packaging-improved-successful-deliveries',
    'one-neighborhoods-journey-toward-zero-food-waste'
  )),
  10,
  'all 10 seeded stories are published'
);

-- 3. Anonymous users can read published stories but draft stories remain hidden
INSERT INTO public.blogs (id, title, slug, content, status)
VALUES ('b9999999-0000-4000-8000-000000000099', 'Draft story', 'draft-secret-story', 'Secret unpublished draft content.', 'draft')
ON CONFLICT (slug) DO NOTHING;

SET LOCAL ROLE anon;
SELECT ok(
  EXISTS (SELECT 1 FROM public.blogs WHERE slug = 'wedding-surplus-became-240-community-meals'),
  'anonymous users can read published stories'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.blogs WHERE slug = 'draft-secret-story'),
  'draft stories remain hidden from anonymous users'
);
RESET ROLE;

-- 4. Exactly five identified rolling events exist
SELECT is(
  (SELECT count(*)::integer FROM public.events WHERE is_rolling = true AND id IN (
    'e0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000002',
    'e0000000-0000-4000-8000-000000000003',
    'e0000000-0000-4000-8000-000000000004',
    'e0000000-0000-4000-8000-000000000005'
  )),
  5,
  'exactly five identified rolling events exist'
);

-- 5. Their effective dates fall within the next 10 days
SELECT is(
  (SELECT count(*)::integer FROM public.events
   WHERE is_rolling = true
     AND date >= CURRENT_DATE
     AND date <= (CURRENT_DATE + interval '10 days')),
  5,
  'all rolling events have effective dates within the next 10 days'
);

-- 6. Fixed events are not moved by refresh
INSERT INTO public.events (id, title, description, date, location, is_rolling, is_published)
VALUES (
  'e9999999-0000-4000-8000-000000000099',
  'Fixed Gala Event',
  'A non-rolling fixed date charity gala event.',
  '2028-12-31 18:00:00+00',
  'Grand Ballroom',
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET date = '2028-12-31 18:00:00+00', is_rolling = false;

SELECT lives_ok(
  $$ SELECT internal.refresh_rolling_events() $$,
  'service_role can execute internal.refresh_rolling_events()'
);

SELECT is(
  (SELECT date FROM public.events WHERE id = 'e9999999-0000-4000-8000-000000000099'),
  '2028-12-31 18:00:00+00'::timestamptz,
  'fixed events are not moved by the rolling refresh function'
);

-- 7. Public and authenticated roles cannot execute rolling refresh function
SELECT ok(
  NOT has_function_privilege('anon', 'internal.refresh_rolling_events()', 'EXECUTE'),
  'anon role cannot execute rolling refresh function'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'internal.refresh_rolling_events()', 'EXECUTE'),
  'authenticated role cannot execute rolling refresh function'
);
SELECT ok(
  has_function_privilege('service_role', 'internal.refresh_rolling_events()', 'EXECUTE'),
  'service_role can execute rolling refresh function'
);

-- 8. Refresh is idempotent
SELECT is(
  (SELECT internal.refresh_rolling_events()),
  0,
  'second immediate run of refresh_rolling_events updates 0 rows (idempotent)'
);
SELECT is(
  (SELECT internal.refresh_rolling_events()),
  0,
  'third immediate run of refresh_rolling_events updates 0 rows (idempotent)'
);

-- 9. All 5 rolling events have rolling_offset_days between 1 and 10
SELECT is(
  (SELECT count(*)::integer FROM public.events WHERE is_rolling = true AND rolling_offset_days BETWEEN 1 AND 10),
  5,
  'all 5 rolling events have rolling offsets between 1 and 10'
);

SELECT * FROM finish();
ROLLBACK;
