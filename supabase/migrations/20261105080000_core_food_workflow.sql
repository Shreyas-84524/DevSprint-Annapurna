-- Forward migration: listings, claims, delivery lifecycle, and privacy access control.

-- 1. Table: food_listings
CREATE TABLE IF NOT EXISTS public.food_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) >= 2 AND char_length(title) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (char_length(btrim(unit)) >= 1 AND char_length(unit) <= 50),
  food_type TEXT NOT NULL CHECK (food_type IN ('veg', 'non-veg', 'vegan', 'other')),
  dietary_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'claimed', 'in_delivery', 'completed', 'expired', 'cancelled', 'rejected_qc')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  pickup_location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
  general_area TEXT,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: listing_pickup_details (Strict 1:1 Privacy Table)
CREATE TABLE IF NOT EXISTS public.listing_pickup_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.food_listings(id) ON DELETE CASCADE,
  pickup_location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL CHECK (char_length(btrim(pickup_address)) >= 3),
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  pickup_instructions TEXT CHECK (pickup_instructions IS NULL OR char_length(pickup_instructions) <= 1000),
  contact_phone TEXT NOT NULL CHECK (char_length(btrim(contact_phone)) >= 8 AND char_length(contact_phone) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: listing_images
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Table: claims
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'fulfilled')),
  delivery_location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
  dropoff_address TEXT NOT NULL CHECK (char_length(btrim(dropoff_address)) >= 3),
  dropoff_latitude NUMERIC(10, 7) NOT NULL CHECK (dropoff_latitude >= -90.0 AND dropoff_latitude <= 90.0),
  dropoff_longitude NUMERIC(10, 7) NOT NULL CHECK (dropoff_longitude >= -180.0 AND dropoff_longitude <= 180.0),
  dropoff_instructions TEXT,
  dropoff_contact_phone TEXT NOT NULL CHECK (char_length(btrim(dropoff_contact_phone)) >= 8),
  idempotency_key TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Table: deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE RESTRICT,
  claim_id UUID NOT NULL UNIQUE REFERENCES public.claims(id) ON DELETE RESTRICT,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_volunteer' CHECK (
    status IN (
      'awaiting_volunteer',
      'assigned',
      'at_pickup',
      'qc_passed',
      'qc_failed',
      'collected',
      'en_route_dropoff',
      'handed_over',
      'receipt_confirmed',
      'cancelled'
    )
  ),
  assigned_at TIMESTAMPTZ,
  at_pickup_at TIMESTAMPTZ,
  qc_passed_at TIMESTAMPTZ,
  qc_failed_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  en_route_dropoff_at TIMESTAMPTZ,
  handed_over_at TIMESTAMPTZ,
  confirmed_receipt_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT deliveries_assigned_volunteer_check CHECK (
    status IN ('awaiting_volunteer', 'cancelled') OR volunteer_id IS NOT NULL
  )
);

-- 6. Table: delivery_events (Append-only Audit Trail)
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('donor', 'requester', 'volunteer', 'admin', 'system')),
  from_status TEXT CHECK (
    from_status IS NULL OR from_status IN (
      'awaiting_volunteer', 'assigned', 'at_pickup', 'qc_passed', 'qc_failed',
      'collected', 'en_route_dropoff', 'handed_over', 'receipt_confirmed', 'cancelled'
    )
  ),
  to_status TEXT NOT NULL CHECK (
    to_status IN (
      'awaiting_volunteer', 'assigned', 'at_pickup', 'qc_passed', 'qc_failed',
      'collected', 'en_route_dropoff', 'handed_over', 'receipt_confirmed', 'cancelled'
    )
  ),
  event_name TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Invariants & Indexes
-- Unique active claim per food listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_active_listing
  ON public.claims (listing_id)
  WHERE status = 'active';

-- Unique active delivery per volunteer across non-terminal states
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_one_active_volunteer
  ON public.deliveries (volunteer_id)
  WHERE volunteer_id IS NOT NULL
    AND status NOT IN ('qc_failed', 'receipt_confirmed', 'cancelled');

-- Idempotency key uniqueness for claims
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_requester_idempotency
  ON public.claims (requester_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Idempotency key uniqueness for delivery events
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_events_actor_idempotency
  ON public.delivery_events (actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Relational and filter performance indexes
CREATE INDEX IF NOT EXISTS idx_food_listings_donor_id ON public.food_listings (donor_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_status_expires ON public.food_listings (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_listing_pickup_details_listing_id ON public.listing_pickup_details (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_pickup_details_coords ON public.listing_pickup_details (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images (listing_id);
CREATE INDEX IF NOT EXISTS idx_claims_listing_id ON public.claims (listing_id);
CREATE INDEX IF NOT EXISTS idx_claims_requester_id ON public.claims (requester_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_listing_id ON public.deliveries (listing_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_donor_id ON public.deliveries (donor_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_requester_id ON public.deliveries (requester_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_volunteer_id ON public.deliveries (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries (status);
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON public.delivery_events (delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_actor_id ON public.delivery_events (actor_id);

-- Triggers for updated_at and row_version
CREATE OR REPLACE FUNCTION public.bump_row_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.row_version = OLD.row_version + 1;
  NEW.updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_row_version() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_food_listings_bump_version
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_row_version();

CREATE TRIGGER trg_deliveries_bump_version
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_row_version();

CREATE TRIGGER trg_listing_pickup_details_timestamp
  BEFORE UPDATE ON public.listing_pickup_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

CREATE TRIGGER trg_claims_timestamp
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_row_timestamp();

-- PostgREST Data API Access Control
REVOKE ALL ON TABLE public.food_listings FROM anon, authenticated;
REVOKE ALL ON TABLE public.listing_pickup_details FROM anon, authenticated;
REVOKE ALL ON TABLE public.listing_images FROM anon, authenticated;
REVOKE ALL ON TABLE public.claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.deliveries FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_events FROM anon, authenticated;

-- Anon grants: read published listings and images
GRANT SELECT ON TABLE public.food_listings TO anon;
GRANT SELECT ON TABLE public.listing_images TO anon;

-- Authenticated role grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.food_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.listing_pickup_details TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.listing_images TO authenticated;
GRANT SELECT ON TABLE public.claims TO authenticated;
GRANT SELECT ON TABLE public.deliveries TO authenticated;
GRANT SELECT ON TABLE public.delivery_events TO authenticated;

-- Service role grants
GRANT ALL ON TABLE public.food_listings TO service_role;
GRANT ALL ON TABLE public.listing_pickup_details TO service_role;
GRANT ALL ON TABLE public.listing_images TO service_role;
GRANT ALL ON TABLE public.claims TO service_role;
GRANT ALL ON TABLE public.deliveries TO service_role;
GRANT ALL ON TABLE public.delivery_events TO service_role;

-- Row Level Security (RLS) Enablement
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_pickup_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

-- 1. food_listings RLS Policies
CREATE POLICY "food_listings_select_published"
  ON public.food_listings FOR SELECT
  USING (status = 'published' AND expires_at > pg_catalog.timezone('utc'::text, pg_catalog.now()));

CREATE POLICY "food_listings_select_own"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = donor_id);

CREATE POLICY "food_listings_select_claimed"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.listing_id = food_listings.id
        AND c.requester_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "food_listings_select_assigned"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.listing_id = food_listings.id
        AND d.volunteer_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "food_listings_select_admin"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING (internal.is_admin());

CREATE POLICY "food_listings_insert_donor"
  ON public.food_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = donor_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'donor'
        AND p.is_verified = true
    )
  );

CREATE POLICY "food_listings_update_donor"
  ON public.food_listings FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = donor_id
    AND status IN ('draft', 'published')
  )
  WITH CHECK (
    (SELECT auth.uid()) = donor_id
    AND status IN ('draft', 'published', 'claimed', 'cancelled')
  );

CREATE POLICY "food_listings_delete_donor"
  ON public.food_listings FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = donor_id
    AND status = 'draft'
  );

-- 2. listing_pickup_details RLS Policies (STRICT PRIVACY)
CREATE POLICY "listing_pickup_details_select"
  ON public.listing_pickup_details FOR SELECT
  TO authenticated
  USING (
    internal.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_pickup_details.listing_id
        AND l.donor_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.listing_id = listing_pickup_details.listing_id
        AND c.requester_id = (SELECT auth.uid())
        AND c.status IN ('active', 'fulfilled')
    )
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.listing_id = listing_pickup_details.listing_id
        AND d.volunteer_id = (SELECT auth.uid())
        AND d.status NOT IN ('qc_failed', 'receipt_confirmed', 'cancelled')
    )
  );

CREATE POLICY "listing_pickup_details_insert_donor"
  ON public.listing_pickup_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_pickup_details.listing_id
        AND l.donor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "listing_pickup_details_update_donor"
  ON public.listing_pickup_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_pickup_details.listing_id
        AND l.donor_id = (SELECT auth.uid())
        AND l.status IN ('draft', 'published')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_pickup_details.listing_id
        AND l.donor_id = (SELECT auth.uid())
    )
  );

-- 3. listing_images RLS Policies
CREATE POLICY "listing_images_select_public"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_images.listing_id
        AND (l.status = 'published' OR l.donor_id = (SELECT auth.uid()) OR internal.is_admin())
    )
  );

CREATE POLICY "listing_images_insert_donor"
  ON public.listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_images.listing_id
        AND l.donor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "listing_images_delete_donor"
  ON public.listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = listing_images.listing_id
        AND l.donor_id = (SELECT auth.uid())
        AND l.status IN ('draft', 'published')
    )
  );

-- 4. claims RLS Policies
CREATE POLICY "claims_select_participant"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.food_listings l
      WHERE l.id = claims.listing_id AND l.donor_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.claim_id = claims.id AND d.volunteer_id = (SELECT auth.uid())
    )
    OR internal.is_admin()
  );

-- 5. deliveries RLS Policies
CREATE POLICY "deliveries_select_participant"
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (
    donor_id = (SELECT auth.uid())
    OR requester_id = (SELECT auth.uid())
    OR volunteer_id = (SELECT auth.uid())
    OR (status = 'awaiting_volunteer' AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'volunteer'
    ))
    OR internal.is_admin()
  );

-- 6. delivery_events RLS Policies
CREATE POLICY "delivery_events_select_participant"
  ON public.delivery_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_events.delivery_id
        AND (
          d.donor_id = (SELECT auth.uid())
          OR d.requester_id = (SELECT auth.uid())
          OR d.volunteer_id = (SELECT auth.uid())
          OR internal.is_admin()
        )
    )
  );

-- Storage Bucket: listing-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY "listing_images_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

CREATE POLICY "listing_images_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "listing_images_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Atomic Stored Procedures

-- 1. claim_food_listing
CREATE OR REPLACE FUNCTION public.claim_food_listing(
  p_listing_id UUID,
  p_requester_id UUID,
  p_delivery_location_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_listing public.food_listings%ROWTYPE;
  v_requester public.profiles%ROWTYPE;
  v_location public.saved_locations%ROWTYPE;
  v_claim public.claims%ROWTYPE;
  v_delivery public.deliveries%ROWTYPE;
  v_existing_claim public.claims%ROWTYPE;
  v_dropoff_address TEXT;
  v_dropoff_lat NUMERIC;
  v_dropoff_lng NUMERIC;
  v_dropoff_phone TEXT;
BEGIN
  -- Replay check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_claim
    FROM public.claims
    WHERE requester_id = p_requester_id
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      SELECT * INTO v_delivery
      FROM public.deliveries
      WHERE claim_id = v_existing_claim.id;

      RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'claim_id', v_existing_claim.id,
        'delivery_id', v_delivery.id,
        'listing_id', v_existing_claim.listing_id,
        'status', 'replayed'
      );
    END IF;
  END IF;

  -- Requester verification check
  SELECT * INTO v_requester
  FROM public.profiles
  WHERE id = p_requester_id;

  IF NOT FOUND OR v_requester.role <> 'requester' OR NOT v_requester.is_verified THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_REQUESTER';
  END IF;

  -- Resolve delivery location details
  IF p_delivery_location_id IS NOT NULL THEN
    SELECT * INTO v_location
    FROM public.saved_locations
    WHERE id = p_delivery_location_id
      AND user_id = p_requester_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LOCATION_NOT_FOUND';
    END IF;

    v_dropoff_address := COALESCE(v_location.address, v_location.label);
    v_dropoff_lat := v_location.latitude;
    v_dropoff_lng := v_location.longitude;
  ELSE
    SELECT * INTO v_location
    FROM public.saved_locations
    WHERE user_id = p_requester_id
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_dropoff_address := COALESCE(v_location.address, v_location.label);
      v_dropoff_lat := v_location.latitude;
      v_dropoff_lng := v_location.longitude;
    ELSE
      v_dropoff_address := 'Designated Delivery Location';
      v_dropoff_lat := 19.0760;
      v_dropoff_lng := 72.8777;
    END IF;
  END IF;

  v_dropoff_phone := COALESCE(v_requester.phone, '+919000000000');

  -- Lock listing FOR UPDATE
  SELECT * INTO v_listing
  FROM public.food_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LISTING_NOT_FOUND';
  END IF;

  IF v_listing.expires_at <= pg_catalog.timezone('utc'::text, pg_catalog.now()) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_EXPIRED';
  END IF;

  IF v_listing.status <> 'published' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_ALREADY_CLAIMED';
  END IF;

  -- Transition listing state to claimed
  UPDATE public.food_listings
  SET status = 'claimed',
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE id = p_listing_id;

  -- Insert whole-listing claim
  INSERT INTO public.claims (
    listing_id,
    requester_id,
    status,
    delivery_location_id,
    dropoff_address,
    dropoff_latitude,
    dropoff_longitude,
    dropoff_contact_phone,
    idempotency_key,
    claimed_at
  )
  VALUES (
    p_listing_id,
    p_requester_id,
    'active',
    p_delivery_location_id,
    v_dropoff_address,
    v_dropoff_lat,
    v_dropoff_lng,
    v_dropoff_phone,
    p_idempotency_key,
    pg_catalog.timezone('utc'::text, pg_catalog.now())
  )
  RETURNING * INTO v_claim;

  -- Insert delivery in awaiting_volunteer state
  INSERT INTO public.deliveries (
    listing_id,
    claim_id,
    donor_id,
    requester_id,
    status
  )
  VALUES (
    p_listing_id,
    v_claim.id,
    v_listing.donor_id,
    p_requester_id,
    'awaiting_volunteer'
  )
  RETURNING * INTO v_delivery;

  -- Record audit event
  INSERT INTO public.delivery_events (
    delivery_id,
    actor_id,
    actor_role,
    from_status,
    to_status,
    event_name,
    idempotency_key
  )
  VALUES (
    v_delivery.id,
    p_requester_id,
    'requester',
    NULL,
    'awaiting_volunteer',
    'claim_created',
    p_idempotency_key
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'claim_id', v_claim.id,
    'delivery_id', v_delivery.id,
    'listing_id', p_listing_id,
    'status', 'claimed'
  );
END;
$$;

-- Alias for claim_food_listing_tx
CREATE OR REPLACE FUNCTION public.claim_food_listing_tx(
  p_listing_id UUID,
  p_requester_id UUID,
  p_delivery_location_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.claim_food_listing(p_listing_id, p_requester_id, p_delivery_location_id, p_idempotency_key);
END;
$$;

-- 2. accept_delivery_task
CREATE OR REPLACE FUNCTION public.accept_delivery_task(
  p_delivery_id UUID,
  p_volunteer_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_volunteer public.profiles%ROWTYPE;
  v_delivery public.deliveries%ROWTYPE;
BEGIN
  -- Replay check
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE id = p_delivery_id
    AND volunteer_id = p_volunteer_id;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'delivery_id', v_delivery.id,
      'volunteer_id', p_volunteer_id,
      'status', 'assigned',
      'replayed', true
    );
  END IF;

  -- Volunteer validation
  SELECT * INTO v_volunteer
  FROM public.profiles
  WHERE id = p_volunteer_id;

  IF NOT FOUND OR v_volunteer.role <> 'volunteer' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_VOLUNTEER';
  END IF;

  -- Single active delivery enforcement
  IF EXISTS (
    SELECT 1 FROM public.deliveries
    WHERE volunteer_id = p_volunteer_id
      AND status NOT IN ('qc_failed', 'receipt_confirmed', 'cancelled')
      AND id <> p_delivery_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS';
  END IF;

  -- Lock delivery FOR UPDATE
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DELIVERY_NOT_FOUND';
  END IF;

  IF v_delivery.status <> 'awaiting_volunteer' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ALREADY_ASSIGNED';
  END IF;

  -- Assign volunteer and advance status to assigned
  UPDATE public.deliveries
  SET volunteer_id = p_volunteer_id,
      status = 'assigned',
      assigned_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  -- Advance listing status to in_delivery
  UPDATE public.food_listings
  SET status = 'in_delivery',
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE id = v_delivery.listing_id;

  -- Record audit event
  INSERT INTO public.delivery_events (
    delivery_id,
    actor_id,
    actor_role,
    from_status,
    to_status,
    event_name,
    idempotency_key
  )
  VALUES (
    p_delivery_id,
    p_volunteer_id,
    'volunteer',
    'awaiting_volunteer',
    'assigned',
    'volunteer_assigned',
    p_idempotency_key
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'volunteer_id', p_volunteer_id,
    'status', 'assigned'
  );
END;
$$;

-- Alias for accept_delivery_task_tx
CREATE OR REPLACE FUNCTION public.accept_delivery_task_tx(
  p_delivery_id UUID,
  p_volunteer_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.accept_delivery_task(p_delivery_id, p_volunteer_id, p_idempotency_key);
END;
$$;

-- Revoke default PUBLIC execution privileges and grant strictly to service_role
REVOKE ALL ON FUNCTION public.claim_food_listing(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_food_listing_tx(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_delivery_task(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_delivery_task_tx(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_food_listing(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_food_listing_tx(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_delivery_task(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_delivery_task_tx(UUID, UUID, TEXT) TO service_role;
