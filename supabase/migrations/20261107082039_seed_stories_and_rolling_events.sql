-- Forward migration: seed 10 original impact stories and 5 automatically rolling upcoming events
-- Idempotent: safe for re-execution without duplicate records or destructive resets.

-- 1. Extend events table to support maintainable rolling events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_rolling BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rolling_offset_days INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass AND conname = 'events_rolling_offset_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_rolling_offset_check
      CHECK (rolling_offset_days IS NULL OR (rolling_offset_days >= 1 AND rolling_offset_days <= 10));
  END IF;
END $$;

-- 2. Privileged rolling refresh function in internal schema
CREATE OR REPLACE FUNCTION internal.refresh_rolling_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.events
    SET
      date = (CURRENT_DATE + (rolling_offset_days || ' days')::interval + (date::time)::interval),
      updated_at = CASE
        WHEN date::date = (CURRENT_DATE + (rolling_offset_days || ' days')::interval)::date THEN updated_at
        ELSE pg_catalog.now()
      END
    WHERE is_rolling = true
      AND rolling_offset_days IS NOT NULL
      AND date::date != (CURRENT_DATE + (rolling_offset_days || ' days')::interval)::date
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;

  RETURN v_updated_count;
END;
$$;

-- Revoke public execution of rolling refresh function
REVOKE EXECUTE ON FUNCTION internal.refresh_rolling_events() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.refresh_rolling_events() TO service_role;

-- Public wrapper for service_role RPC invocation
CREATE OR REPLACE FUNCTION public.refresh_rolling_events()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT internal.refresh_rolling_events();
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_rolling_events() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_rolling_events() TO service_role;

-- 3. Optional pg_cron scheduling if extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    -- Unschedule previous job if present
    BEGIN
      PERFORM cron.unschedule('refresh_rolling_events_daily');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    -- Schedule daily at midnight UTC
    BEGIN
      PERFORM cron.schedule(
        'refresh_rolling_events_daily',
        '0 0 * * *',
        'SELECT internal.refresh_rolling_events();'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Seed Blog Categories
INSERT INTO public.blog_categories (name, slug)
VALUES
  ('Impact Stories', 'impact-stories'),
  ('Community', 'community'),
  ('Volunteers', 'volunteers'),
  ('Food Rescue', 'food-rescue'),
  ('Operations', 'operations')
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed 10 Original Food Redistribution Impact Stories
INSERT INTO public.blogs (id, title, slug, content, image_url, category_id, status, created_at)
VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  'Wedding Surplus Became 240 Community Meals',
  'wedding-surplus-became-240-community-meals',
  'On an autumn evening in South Mumbai, a large wedding reception concluded with an abundance of untouched, banquet-quality gourmet meals. Under traditional catering arrangements, surplus of this magnitude often risks disposal simply due to cold-chain logistics and late-night timing. Instead, the catering supervisor opened the Annapurna platform at 10:45 PM.

Within seven minutes of listing 240 multi-course meal portions, three volunteer dispatchers in the neighboring district accepted the rescue request. The donor kitchen had already packaged the hot curries, fragrant biryanis, and baked breads into heavy-gauge thermal containers with temperature and allergen labels.

By 11:35 PM, the volunteers arrived in two coordinated vehicles equipped with food-grade transport crates. Following Annapurna''s safety protocol, temperature verification was logged via digital thermometer before handover. The food was immediately rerouted to two nighttime shelter hubs and a municipal transit workers'' rest station where fresh meals were welcomed warmly.

Seeing hot, wholesome food reach people who genuinely appreciate it, rather than throwing away culinary effort, brought a sense of real fulfillment to the whole event team, remarked the banquet manager. Through efficient, dignified food rescue, 240 nutritious meals replaced what would have been waste, showcasing how digital coordination can bridge surplus and need in minutes.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'impact-stories'),
  'published',
  pg_catalog.now() - interval '9 days'
),
(
  'b0000000-0000-4000-8000-000000000002',
  'A Restaurant’s Nightly Food Rescue Routine',
  'restaurants-nightly-food-rescue-routine',
  'For urban restaurant kitchens, managing evening inventory is an intricate balancing act. Even the most precise forecasting leaves unserved soup bases, freshly baked baguettes, and prepared salad portions at closing time. Chef Anand of Bistro Green decided that tossing this fresh food was unacceptable.

Bistro Green integrated Annapurna into their nightly closing checklist. At 10:15 PM, as the floor staff cleans the dining room, the sous chef tallies the remaining prepared batches and creates a verified listing. Rather than treating food rescue as an afterthought, the team adopted standard 1-liter eco-friendly containers labeled with preparation timestamps.

The platform makes the handoff effortless, says Anand. We do not need back-and-forth phone calls or unpredictable waiting. The assigned volunteer arrives within our 30-minute departure window, scans the verification OTP, and departs smoothly.

Over the past four months, this 10-minute nightly routine has saved more than 1,800 kilograms of chef-crafted food from compost bins, delivering wholesome dinners to an nearby non-profit youth training center. For Bistro Green''s staff, ending every shift knowing zero food was wasted has fundamentally transformed workplace morale.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'operations'),
  'published',
  pg_catalog.now() - interval '8 days'
),
(
  'b0000000-0000-4000-8000-000000000003',
  'College Volunteers Built a Last-Mile Meal Network',
  'college-volunteers-built-last-mile-meal-network',
  'When university exams concluded, a group of twenty undergraduate students in Pune noticed a recurring challenge: local bakeries and fruit markets often had fresh inventory to donate, but lacked vehicles or personnel to transport items to local community kitchens before morning.

Forming a student volunteer squad on Annapurna, they mapped out high-density collection corridors that could be traversed easily on bicycles and electric scooters fitted with insulated delivery bags. Using the Annapurna real-time task board, volunteers claim pickups on their evening commute home from library sessions.

During their first month of operation, the student network completed 310 deliveries without a single safety incident or transit delay. Their coordinated routes ensure that delicate produce, fresh bakery items, and milk packets arrive at designated food banks within forty minutes of collection.

Volunteering through a smart platform means we don''t need large budgets or permanent office space, explains team lead Priya. The GPS-guided dispatch and role-based tracking let each student contribute one hour a week while collectively moving tons of wholesome food to where it matters most.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'volunteers'),
  'published',
  pg_catalog.now() - interval '7 days'
),
(
  'b0000000-0000-4000-8000-000000000004',
  'A Family Donor Helped a Nearby Shelter',
  'family-donor-helped-nearby-shelter',
  'When the Sharma family hosted an extended anniversary reunion, they intentionally prepared generous portions for fifty visiting relatives. As the afternoon concluded, three untouched platters of steamed basmati rice, lentils, and mixed vegetable roasts remained in clean stainless-steel trays.

Rather than refrigerating trays beyond household capacity, Mrs. Sharma accessed Annapurna. After entering the listing details and dietary notes, a volunteer from two streets away accepted the pickup within twelve minutes.

The volunteer arrived with standardized packaging supplies and thermal transit bags, verifying the pickup with a single-use secure code. Less than half an hour later, the warm meals were served at a nearby elderly community home whose evening kitchen was understaffed for the holiday.

The entire experience felt respectful, transparent, and seamless, Mrs. Sharma shared. We could see exactly when the food was collected and safely received. Knowing our family celebration could bring comfort and a hot meal to elderly neighbors made our anniversary far more meaningful.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'community'),
  'published',
  pg_catalog.now() - interval '6 days'
),
(
  'b0000000-0000-4000-8000-000000000005',
  'Requesters Found Meals Without Losing Dignity',
  'requesters-found-meals-without-losing-dignity',
  'Accessing nutritional assistance during sudden economic hardship or medical crises often involves bureaucratic queues and uncomfortable public scrutiny. Annapurna was architected specifically to dismantle these barriers through private, dignified mobile technology.

At a local daycare and community support center in an industrial zone, director Sunita uses the requester portal to source evening snacks and fruit rations for sixty children of shift laborers. Instead of asking families to stand in line for dry grain rations, Sunita reviews available fresh donations posted by local corporate cafeterias and farmers'' markets on the platform.

With whole-listing atomic claiming, requests are confirmed instantly without administrative back-and-forth. The delivery arrives directly at the center''s certified storage pantry, transported by trained volunteers adhering to strict hygiene protocols.

Dignity is paramount, Sunita emphasizes. When parents pick up their children, they receive fresh fruit bags and nutritious meals packaged cleanly and discreetly. Annapurna treats food support not as charity, but as efficient resource stewardship that honors every individual.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'impact-stories'),
  'published',
  pg_catalog.now() - interval '5 days'
),
(
  'b0000000-0000-4000-8000-000000000006',
  'Volunteers Coordinated During Heavy Rain',
  'volunteers-coordinated-during-heavy-rain',
  'During peak monsoon season, sudden torrential downpours frequently disrupt urban transport, threatening to spoil perishable food donations waiting in commercial kitchens. When an unexpected storm flooded a major arterial road last Tuesday, eighteen pending food rescue deliveries hung in the balance.

Using Annapurna''s live routing and participant coordination, volunteers adapted on the fly. Drivers in higher-clearance vehicles teamed up with foot couriers stationed near metro stations to establish dry relay handoffs. Using the platform''s real-time tracking, donors received live notifications adjusting arrival estimates, ensuring hot meals remained properly insulated.

Despite forty millimeters of rain in two hours, all eighteen food batches—including 400 liters of hot vegetable stew from a hospital dietary center—reached regional distribution centers safely and at serving temperature.

The technology gave us visibility across the city, said dispatch volunteer Rahul. Instead of guessing whether a road was passable or losing track of donations, our community moved as one coordinated team. The weather was harsh, but not a single meal was lost.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'volunteers'),
  'published',
  pg_catalog.now() - interval '4 days'
),
(
  'b0000000-0000-4000-8000-000000000007',
  'Corporate Cafeteria Surplus Supported Night Workers',
  'corporate-cafeteria-surplus-supported-night-workers',
  'In modern commercial office parks, corporate cafeterias cater to thousands of employees across breakfast and lunch services. Due to stringent catering surplus rules, high-grade prepared trays of roasted vegetables, paneer dishes, and whole grains frequently went unconsumed at 4:00 PM.

A multinational technology campus partnered with Annapurna to introduce scheduled cafeteria surplus dispatches. Operating under certified safety protocols, the culinary staff rapidly chills surplus batches immediately following lunch service, sealing them in barcoded, food-grade biodegradable trays.

At 6:00 PM, volunteer drivers collect the trays and route them to municipal night shelters, sanitation worker depots, and community care clinics operating round-the-clock shifts. The recipient organizations receive nutritious, restaurant-caliber meals right as their evening shifts begin.

Our company has ambitious sustainability and zero-waste targets, stated the campus facilities director. Annapurna provided the compliance tracking, temperature logging, and dispatch speed necessary to meet corporate safety standards while ensuring thousands of nutritious meals reach dedicated frontline workers every month.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'food-rescue'),
  'published',
  pg_catalog.now() - interval '3 days'
),
(
  'b0000000-0000-4000-8000-000000000008',
  'Community Kitchens Reduced Weekend Food Waste',
  'community-kitchens-reduced-weekend-food-waste',
  'Over weekends, wholesale agricultural markets and wholesale produce mandis face an influx of unsold, perfectly ripe fruits and vegetables that cannot wait for Monday''s commercial buyers. Without rapid intervention, metric tons of nutrient-dense produce end up in landfills.

A network of four community kitchens across the city formed a collective rescue coalition using Annapurna. Every Saturday afternoon, produce vendors list available crates of tomatoes, greens, squash, and seasonal melons on the platform. The kitchens instantly claim the produce and coordinate collective transport.

Volunteers wash, prep, and transform the surplus into large-batch stews, lentil soups, and preserved fruit preserves distributed across underserved neighborhood centers on Sundays.

Food that might look slightly imperfect on a supermarket shelf makes the most delicious, nourishing meals, explains head cook Fatima. By coordinating through Annapurna, our four kitchens rescued eleven tons of fresh farm produce last month alone, proving that community collaboration is the ultimate antidote to food waste.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'community'),
  'published',
  pg_catalog.now() - interval '2 days'
),
(
  'b0000000-0000-4000-8000-000000000009',
  'Safe Packaging Improved Successful Deliveries',
  'safe-packaging-improved-successful-deliveries',
  'In food redistribution, rescue volume is only half the battle; maintaining food safety from collection to consumption is what truly saves lives. To eliminate transit spillage and temperature degradation, Annapurna rolled out standardized packaging guidelines and temperature check-ins across its partner network.

Commercial donors were provided with reusable, insulated transport containers and tamper-evident biodegradable seal strips. Donors log the packaging type and dispatch temperature directly into the platform when creating each listing. Volunteers verify container integrity and record pickup timestamps using their mobile interface before commencing transit.

The initiative reduced packaging-related delivery incidents by ninety-four percent in the first sixty days. Recipient centers report greater confidence and streamlined distribution because every meal arrives sealed, labeled with preparation hours, and held at food-safe temperatures.

When a volunteer hands over a container with intact seals and clear allergen tags, it reflects respect and professional care, notes community clinic director David. High safety standards elevate food rescue into an indispensable public health asset.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'operations'),
  'published',
  pg_catalog.now() - interval '1 day'
),
(
  'b0000000-0000-4000-8000-000000000010',
  'One Neighborhood’s Journey Toward Zero Food Waste',
  'one-neighborhoods-journey-toward-zero-food-waste',
  'What started as three neighboring apartment complexes trying to manage festival surplus has blossomed into a full-scale neighborhood food rescue ecosystem. The Green Park Resident Welfare Association in New Delhi became the first urban pocket to test Annapurna''s hyper-local community loop.

The association installed a secure, temperature-monitored community pantry at the neighborhood gatehouse, accessible through verified volunteer digital codes. Resident families, local corner stores, and neighborhood bakeries list extra provisions—ranging from surplus party platters to unopened dairy cartons—directly onto the Annapurna app.

Trained local youth volunteers manage regular quality checks and ensure food is claimed by resident workers, domestic staff, and local shelter representatives within hours of posting. Over six months, the community diverted an estimated fourteen thousand kilograms of organic waste from municipal landfills, creating a circular model that other neighborhoods are now actively replicating.

Before Annapurna, individuals felt hesitant or didn''t know where to take extra food, said association president Meenakshi. Now, zero food waste is part of our neighborhood culture. When you see neighbors actively coordinating to ensure nobody goes hungry while keeping our streets clean, it proves that local communities hold the power to create lasting change.',
  NULL,
  (SELECT id FROM public.blog_categories WHERE slug = 'community'),
  'published',
  pg_catalog.now()
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category_id = EXCLUDED.category_id,
  status = 'published';

-- 6. Seed 5 Recurring Demo Events with Rolling Offsets (1, 3, 5, 7, 9 days)
INSERT INTO public.events (id, title, description, date, location, image_url, is_published, is_rolling, rolling_offset_days)
VALUES
(
  'e0000000-0000-4000-8000-000000000001',
  'Community Food Collection Drive',
  'Join local residents and volunteers for our morning food collection and sorting drive. Packaged staples and surplus produce are sorted for community kitchens.',
  (CURRENT_DATE + interval '1 day' + time '10:00:00'),
  'Central Community Center, Sector 4',
  NULL,
  true,
  true,
  1
),
(
  'e0000000-0000-4000-8000-000000000002',
  'Restaurant Partner Orientation',
  'A practical onboarding session for local restaurant owners and commercial kitchens on safe surplus packaging, pickup scheduling, and quality standards.',
  (CURRENT_DATE + interval '3 days' + time '15:00:00'),
  'Annapurna Operations Hub, Ward 12',
  NULL,
  true,
  true,
  3
),
(
  'e0000000-0000-4000-8000-000000000003',
  'Volunteer Packing and Safety Workshop',
  'Hands-on training for food rescue volunteers covering hygienic transit protocols, thermal container handling, and mobile delivery workflow navigation.',
  (CURRENT_DATE + interval '5 days' + time '11:00:00'),
  'Youth Sports Complex, Hall B',
  NULL,
  true,
  true,
  5
),
(
  'e0000000-0000-4000-8000-000000000004',
  'Zero-Waste Community Lunch',
  'A communal gathering celebrating zero hunger and zero waste. Prepared with certified surplus produce to promote mindful consumption and shared dignity.',
  (CURRENT_DATE + interval '7 days' + time '13:00:00'),
  'Civic Gardens Pavilion',
  NULL,
  true,
  true,
  7
),
(
  'e0000000-0000-4000-8000-000000000005',
  'Neighborhood Meal Distribution Day',
  'Coordinated last-mile meal delivery and direct distribution supporting shelter residents and evening shifts across local municipal wards.',
  (CURRENT_DATE + interval '9 days' + time '17:00:00'),
  'Eastside Distribution Point',
  NULL,
  true,
  true,
  9
)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  date = EXCLUDED.date,
  location = EXCLUDED.location,
  is_published = true,
  is_rolling = true,
  rolling_offset_days = EXCLUDED.rolling_offset_days;

-- 7. Initialize rolling dates to target offsets immediately
SELECT internal.refresh_rolling_events();
