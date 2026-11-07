-- Complete the listing and delivery workflow with transactional commands,
-- persisted tracking, QC evidence, recovery, and route caching.

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS dropoff_area TEXT;

CREATE TABLE IF NOT EXISTS public.workflow_idempotency (
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  resource_id UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (actor_id, command_name, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.delivery_qc (
  delivery_id UUID PRIMARY KEY REFERENCES public.deliveries(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m NUMERIC(8, 2) NOT NULL CHECK (accuracy_m > 0 AND accuracy_m <= 1000),
  captured_at TIMESTAMPTZ NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (delivery_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.delivery_route_cache (
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  leg TEXT NOT NULL CHECK (leg IN ('pickup', 'dropoff')),
  provider TEXT NOT NULL DEFAULT 'geoapify',
  route JSONB NOT NULL,
  origin_latitude NUMERIC(10, 7) NOT NULL,
  origin_longitude NUMERIC(10, 7) NOT NULL,
  destination_latitude NUMERIC(10, 7) NOT NULL,
  destination_longitude NUMERIC(10, 7) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (delivery_id, leg)
);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_latest
  ON public.delivery_locations (delivery_id, sequence DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_volunteer
  ON public.delivery_locations (volunteer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_qc_volunteer
  ON public.delivery_qc (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_idempotency_created
  ON public.workflow_idempotency (created_at);

ALTER TABLE public.workflow_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_qc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_route_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workflow_idempotency FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_qc FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_locations FROM anon, authenticated;
REVOKE ALL ON TABLE public.delivery_route_cache FROM anon, authenticated;

GRANT SELECT ON TABLE public.delivery_qc TO authenticated;
GRANT SELECT ON TABLE public.delivery_locations TO authenticated;
GRANT SELECT ON TABLE public.delivery_route_cache TO authenticated;
GRANT ALL ON TABLE public.workflow_idempotency TO service_role;
GRANT ALL ON TABLE public.delivery_qc TO service_role;
GRANT ALL ON TABLE public.delivery_locations TO service_role;
GRANT ALL ON TABLE public.delivery_route_cache TO service_role;

CREATE POLICY "delivery_qc_participants_read"
  ON public.delivery_qc FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_qc.delivery_id
        AND (
          d.donor_id = (SELECT auth.uid())
          OR d.requester_id = (SELECT auth.uid())
          OR d.volunteer_id = (SELECT auth.uid())
          OR internal.is_admin()
        )
    )
  );

CREATE POLICY "delivery_locations_participants_read"
  ON public.delivery_locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_locations.delivery_id
        AND (
          d.donor_id = (SELECT auth.uid())
          OR d.requester_id = (SELECT auth.uid())
          OR d.volunteer_id = (SELECT auth.uid())
          OR internal.is_admin()
        )
    )
  );

CREATE POLICY "delivery_route_cache_participants_read"
  ON public.delivery_route_cache FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_route_cache.delivery_id
        AND (
          d.donor_id = (SELECT auth.uid())
          OR d.requester_id = (SELECT auth.uid())
          OR d.volunteer_id = (SELECT auth.uid())
          OR internal.is_admin()
        )
    )
  );

-- Listing creation and required pickup details are committed together.
CREATE OR REPLACE FUNCTION public.create_food_listing(
  p_donor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_food_type TEXT,
  p_dietary_tags TEXT[],
  p_expires_at TIMESTAMPTZ,
  p_pickup_location_id UUID,
  p_publish_immediately BOOLEAN DEFAULT false,
  p_prepared_image_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_location public.saved_locations%ROWTYPE;
  v_listing public.food_listings%ROWTYPE;
  v_object storage.objects%ROWTYPE;
  v_mime TEXT;
  v_size INTEGER;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_donor_id;
  IF NOT FOUND OR v_profile.role <> 'donor' OR NOT v_profile.is_verified THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_DONOR';
  END IF;

  SELECT * INTO v_location
  FROM public.saved_locations
  WHERE id = p_pickup_location_id AND user_id = p_donor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LOCATION_NOT_FOUND';
  END IF;

  IF p_expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_EXPIRY';
  END IF;

  IF p_prepared_image_token IS NOT NULL THEN
    SELECT * INTO v_object
    FROM storage.objects
    WHERE bucket_id = 'listing-images'
      AND name = p_prepared_image_token
      AND (storage.foldername(name))[1] = p_donor_id::text;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVALID_IMAGE_TOKEN';
    END IF;
    v_mime := COALESCE(v_object.metadata->>'mimetype', 'application/octet-stream');
    v_size := COALESCE((v_object.metadata->>'size')::INTEGER, 0);
    IF v_mime NOT IN ('image/jpeg', 'image/png', 'image/webp') OR v_size <= 0 OR v_size > 5242880 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_IMAGE_METADATA';
    END IF;
  END IF;

  INSERT INTO public.food_listings (
    donor_id, title, description, quantity, unit, food_type, dietary_tags,
    status, expires_at, pickup_location_id, general_area
  ) VALUES (
    p_donor_id, p_title, p_description, p_quantity, p_unit, p_food_type,
    COALESCE(p_dietary_tags, '{}'::TEXT[]),
    CASE WHEN p_publish_immediately THEN 'published' ELSE 'draft' END,
    p_expires_at, v_location.id, v_location.label
  ) RETURNING * INTO v_listing;

  INSERT INTO public.listing_pickup_details (
    listing_id, pickup_location_id, pickup_address, latitude, longitude, contact_phone
  ) VALUES (
    v_listing.id, v_location.id, COALESCE(v_location.address, v_location.label),
    v_location.latitude, v_location.longitude, COALESCE(v_profile.phone, '+919000000000')
  );

  IF p_prepared_image_token IS NOT NULL THEN
    INSERT INTO public.listing_images (
      listing_id, storage_path, file_name, file_size_bytes, mime_type, display_order
    ) VALUES (
      v_listing.id, p_prepared_image_token,
      pg_catalog.regexp_replace(p_prepared_image_token, '^.*/', ''),
      v_size, v_mime, 0
    );
  END IF;

  RETURN pg_catalog.to_jsonb(v_listing);
END;
$$;

-- Conditional update prevents stale and post-claim writes.
CREATE OR REPLACE FUNCTION public.update_food_listing(
  p_listing_id UUID,
  p_donor_id UUID,
  p_expected_version INTEGER,
  p_changes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_listing public.food_listings%ROWTYPE;
  v_location public.saved_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_listing
  FROM public.food_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LISTING_NOT_FOUND';
  END IF;
  IF v_listing.donor_id <> p_donor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'FORBIDDEN';
  END IF;
  IF v_listing.status NOT IN ('draft', 'published') OR v_listing.row_version <> p_expected_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'STALE_OR_NOT_EDITABLE';
  END IF;
  IF v_listing.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_EXPIRED';
  END IF;

  IF p_changes ? 'pickupLocationId' THEN
    SELECT * INTO v_location
    FROM public.saved_locations
    WHERE id = (p_changes->>'pickupLocationId')::UUID AND user_id = p_donor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LOCATION_NOT_FOUND';
    END IF;

    UPDATE public.listing_pickup_details SET
      pickup_location_id = v_location.id,
      pickup_address = COALESCE(v_location.address, v_location.label),
      latitude = v_location.latitude,
      longitude = v_location.longitude,
      updated_at = pg_catalog.now()
    WHERE listing_id = p_listing_id;
  END IF;

  UPDATE public.food_listings SET
    title = CASE WHEN p_changes ? 'title' THEN p_changes->>'title' ELSE title END,
    description = CASE WHEN p_changes ? 'description' THEN p_changes->>'description' ELSE description END,
    quantity = CASE WHEN p_changes ? 'quantity' THEN (p_changes->>'quantity')::NUMERIC ELSE quantity END,
    unit = CASE WHEN p_changes ? 'unit' THEN p_changes->>'unit' ELSE unit END,
    food_type = CASE WHEN p_changes ? 'foodType' THEN p_changes->>'foodType' ELSE food_type END,
    dietary_tags = CASE WHEN p_changes ? 'dietaryTags'
      THEN ARRAY(SELECT pg_catalog.jsonb_array_elements_text(p_changes->'dietaryTags')) ELSE dietary_tags END,
    expires_at = CASE WHEN p_changes ? 'expiresAt' THEN (p_changes->>'expiresAt')::TIMESTAMPTZ ELSE expires_at END,
    pickup_location_id = COALESCE(v_location.id, pickup_location_id),
    general_area = COALESCE(v_location.label, general_area),
    row_version = row_version + 1,
    updated_at = pg_catalog.now()
  WHERE id = p_listing_id
    AND donor_id = p_donor_id
    AND row_version = p_expected_version
    AND status IN ('draft', 'published')
  RETURNING * INTO v_listing;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'STALE_OR_NOT_EDITABLE';
  END IF;
  RETURN pg_catalog.to_jsonb(v_listing);
END;
$$;

-- Exact-retry idempotency helper is embedded in each transactional command.
CREATE OR REPLACE FUNCTION public.transition_delivery(
  p_delivery_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB,
  p_idempotency_key TEXT DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delivery public.deliveries%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_existing public.workflow_idempotency%ROWTYPE;
  v_from TEXT;
  v_to TEXT;
  v_event TEXT;
  v_fingerprint TEXT;
  v_response JSONB;
  v_reason TEXT;
  v_qc_result TEXT;
BEGIN
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;
  v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object(
    'delivery', p_delivery_id, 'action', p_action, 'payload', COALESCE(p_payload, '{}'::JSONB)
  )::TEXT);

  SELECT * INTO v_existing FROM public.workflow_idempotency
  WHERE actor_id = p_actor_id AND command_name = p_action AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.resource_id <> p_delivery_id OR v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REUSED';
    END IF;
    RETURN v_existing.response || '{"replayed":true}'::JSONB;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_ACTOR';
  END IF;

  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DELIVERY_NOT_FOUND';
  END IF;
  IF p_expected_version IS NOT NULL AND v_delivery.row_version <> p_expected_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'STALE_ROW_VERSION';
  END IF;

  v_from := v_delivery.status;
  CASE p_action
    WHEN 'arrive_pickup' THEN
      IF p_actor_id <> v_delivery.volunteer_id OR v_from <> 'assigned' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_to := 'at_pickup'; v_event := 'arrived_pickup';
    WHEN 'qc' THEN
      IF p_actor_id <> v_delivery.volunteer_id OR v_from <> 'at_pickup' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_qc_result := p_payload->>'result';
      IF v_qc_result NOT IN ('pass', 'fail') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_QC_RESULT';
      END IF;
      v_to := CASE WHEN v_qc_result = 'pass' THEN 'qc_passed' ELSE 'qc_failed' END;
      v_event := CASE WHEN v_qc_result = 'pass' THEN 'qc_passed' ELSE 'qc_failed' END;
      INSERT INTO public.delivery_qc (delivery_id, volunteer_id, result, notes)
      VALUES (p_delivery_id, p_actor_id, v_qc_result, NULLIF(p_payload->>'notes', ''))
      ON CONFLICT (delivery_id) DO UPDATE SET
        result = EXCLUDED.result, notes = EXCLUDED.notes, checked_at = pg_catalog.now();
    WHEN 'collect' THEN
      IF p_actor_id <> v_delivery.volunteer_id OR v_from <> 'qc_passed' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_to := 'collected'; v_event := 'food_collected';
    WHEN 'start_dropoff' THEN
      IF p_actor_id <> v_delivery.volunteer_id OR v_from <> 'collected' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_to := 'en_route_dropoff'; v_event := 'dropoff_started';
    WHEN 'handover' THEN
      IF p_actor_id <> v_delivery.volunteer_id OR v_from <> 'en_route_dropoff' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_to := 'handed_over'; v_event := 'food_handed_over';
    WHEN 'confirm_receipt' THEN
      IF p_actor_id <> v_delivery.requester_id OR v_from <> 'handed_over' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_to := 'receipt_confirmed'; v_event := 'receipt_confirmed';
    WHEN 'cancel' THEN
      IF v_from IN ('qc_failed', 'receipt_confirmed', 'cancelled') OR NOT (
        p_actor_id IN (v_delivery.donor_id, v_delivery.requester_id, v_delivery.volunteer_id)
        OR v_profile.role = 'admin'
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRANSITION_FORBIDDEN';
      END IF;
      v_reason := NULLIF(pg_catalog.btrim(p_payload->>'reason'), '');
      IF v_reason IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CANCELLATION_REASON_REQUIRED';
      END IF;
      v_to := 'cancelled'; v_event := 'delivery_cancelled';
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'UNKNOWN_ACTION';
  END CASE;

  UPDATE public.deliveries SET
    status = v_to,
    at_pickup_at = CASE WHEN v_to = 'at_pickup' THEN pg_catalog.now() ELSE at_pickup_at END,
    qc_passed_at = CASE WHEN v_to = 'qc_passed' THEN pg_catalog.now() ELSE qc_passed_at END,
    qc_failed_at = CASE WHEN v_to = 'qc_failed' THEN pg_catalog.now() ELSE qc_failed_at END,
    collected_at = CASE WHEN v_to = 'collected' THEN pg_catalog.now() ELSE collected_at END,
    en_route_dropoff_at = CASE WHEN v_to = 'en_route_dropoff' THEN pg_catalog.now() ELSE en_route_dropoff_at END,
    handed_over_at = CASE WHEN v_to = 'handed_over' THEN pg_catalog.now() ELSE handed_over_at END,
    confirmed_receipt_at = CASE WHEN v_to = 'receipt_confirmed' THEN pg_catalog.now() ELSE confirmed_receipt_at END,
    cancelled_at = CASE WHEN v_to = 'cancelled' THEN pg_catalog.now() ELSE cancelled_at END,
    cancellation_reason = CASE WHEN v_to = 'cancelled' THEN v_reason ELSE cancellation_reason END,
    row_version = row_version + 1,
    updated_at = pg_catalog.now()
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  IF v_to = 'receipt_confirmed' THEN
    UPDATE public.claims SET status = 'fulfilled', fulfilled_at = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE id = v_delivery.claim_id;
    UPDATE public.food_listings SET status = 'completed', updated_at = pg_catalog.now()
    WHERE id = v_delivery.listing_id;
  ELSIF v_to = 'qc_failed' THEN
    UPDATE public.claims SET status = 'cancelled', cancelled_at = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE id = v_delivery.claim_id;
    UPDATE public.food_listings SET status = 'rejected_qc', updated_at = pg_catalog.now()
    WHERE id = v_delivery.listing_id;
  ELSIF v_to = 'cancelled' THEN
    UPDATE public.claims SET status = 'cancelled', cancelled_at = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE id = v_delivery.claim_id;
    UPDATE public.food_listings SET
      status = CASE
        WHEN v_from IN ('awaiting_volunteer', 'assigned', 'at_pickup', 'qc_passed') AND expires_at > pg_catalog.now()
          THEN 'published'
        ELSE 'cancelled'
      END,
      updated_at = pg_catalog.now()
    WHERE id = v_delivery.listing_id;
  END IF;

  INSERT INTO public.delivery_events (
    delivery_id, actor_id, actor_role, from_status, to_status, event_name,
    reason, metadata, idempotency_key
  ) VALUES (
    p_delivery_id, p_actor_id, v_profile.role, v_from, v_to, v_event,
    v_reason, COALESCE(p_payload, '{}'::JSONB), p_action || ':' || p_idempotency_key
  );

  v_response := pg_catalog.jsonb_build_object(
    'delivery_id', p_delivery_id,
    'status', v_to,
    'row_version', v_delivery.row_version,
    'replayed', false
  );
  INSERT INTO public.workflow_idempotency (
    actor_id, command_name, idempotency_key, resource_id, request_fingerprint, response
  ) VALUES (p_actor_id, p_action, p_idempotency_key, p_delivery_id, v_fingerprint, v_response);
  RETURN v_response;
END;
$$;

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
  v_existing public.workflow_idempotency%ROWTYPE;
  v_fingerprint TEXT;
  v_response JSONB;
BEGIN
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;
  v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object(
    'listing', p_listing_id, 'delivery_location', p_delivery_location_id
  )::TEXT);
  SELECT * INTO v_existing FROM public.workflow_idempotency
  WHERE actor_id = p_requester_id AND command_name = 'claim_listing'
    AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.resource_id <> p_listing_id OR v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REUSED';
    END IF;
    RETURN v_existing.response || '{"status":"replayed","replayed":true}'::JSONB;
  END IF;

  SELECT * INTO v_requester FROM public.profiles WHERE id = p_requester_id;
  IF NOT FOUND OR v_requester.role <> 'requester' OR NOT v_requester.is_verified THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_REQUESTER';
  END IF;
  SELECT * INTO v_location FROM public.saved_locations
  WHERE user_id = p_requester_id
    AND (p_delivery_location_id IS NULL OR id = p_delivery_location_id)
  ORDER BY (id = p_delivery_location_id) DESC, is_default DESC, created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LOCATION_NOT_FOUND';
  END IF;

  SELECT * INTO v_listing FROM public.food_listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'LISTING_NOT_FOUND';
  END IF;
  IF v_listing.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_EXPIRED';
  END IF;
  IF v_listing.status <> 'published' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_ALREADY_CLAIMED';
  END IF;

  UPDATE public.food_listings SET status = 'claimed', row_version = row_version + 1,
    updated_at = pg_catalog.now() WHERE id = p_listing_id;
  INSERT INTO public.claims (
    listing_id, requester_id, status, delivery_location_id, dropoff_address,
    dropoff_area, dropoff_latitude, dropoff_longitude, dropoff_contact_phone,
    idempotency_key
  ) VALUES (
    p_listing_id, p_requester_id, 'active', v_location.id,
    COALESCE(v_location.address, v_location.label), v_location.label,
    v_location.latitude, v_location.longitude,
    COALESCE(v_requester.phone, '+919000000000'), p_idempotency_key
  ) RETURNING * INTO v_claim;
  INSERT INTO public.deliveries (
    listing_id, claim_id, donor_id, requester_id, status
  ) VALUES (
    p_listing_id, v_claim.id, v_listing.donor_id, p_requester_id, 'awaiting_volunteer'
  ) RETURNING * INTO v_delivery;
  INSERT INTO public.delivery_events (
    delivery_id, actor_id, actor_role, from_status, to_status, event_name, idempotency_key
  ) VALUES (
    v_delivery.id, p_requester_id, 'requester', NULL, 'awaiting_volunteer',
    'claim_created', 'claim_listing:' || p_idempotency_key
  );
  v_response := pg_catalog.jsonb_build_object(
    'success', true, 'claim_id', v_claim.id, 'delivery_id', v_delivery.id,
    'listing_id', p_listing_id, 'status', 'claimed', 'replayed', false
  );
  INSERT INTO public.workflow_idempotency (
    actor_id, command_name, idempotency_key, resource_id, request_fingerprint, response
  ) VALUES (
    p_requester_id, 'claim_listing', p_idempotency_key, p_listing_id, v_fingerprint, v_response
  );
  RETURN v_response;
END;
$$;

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
  v_delivery public.deliveries%ROWTYPE;
  v_volunteer public.profiles%ROWTYPE;
  v_existing public.workflow_idempotency%ROWTYPE;
  v_fingerprint TEXT;
  v_response JSONB;
BEGIN
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;
  v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object('delivery', p_delivery_id)::TEXT);
  SELECT * INTO v_existing FROM public.workflow_idempotency
  WHERE actor_id = p_volunteer_id AND command_name = 'accept_delivery'
    AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.resource_id <> p_delivery_id OR v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_REUSED';
    END IF;
    RETURN v_existing.response || '{"replayed":true}'::JSONB;
  END IF;

  SELECT * INTO v_volunteer FROM public.profiles WHERE id = p_volunteer_id;
  IF NOT FOUND OR v_volunteer.role <> 'volunteer' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHORIZED_VOLUNTEER';
  END IF;
  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DELIVERY_NOT_FOUND';
  END IF;
  IF v_delivery.status <> 'awaiting_volunteer' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ALREADY_ASSIGNED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.deliveries
    WHERE volunteer_id = p_volunteer_id
      AND status NOT IN ('qc_failed', 'receipt_confirmed', 'cancelled')
      AND id <> p_delivery_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS';
  END IF;

  UPDATE public.deliveries SET volunteer_id = p_volunteer_id, status = 'assigned',
    assigned_at = pg_catalog.now(), row_version = row_version + 1,
    updated_at = pg_catalog.now()
  WHERE id = p_delivery_id RETURNING * INTO v_delivery;
  UPDATE public.food_listings SET status = 'in_delivery', updated_at = pg_catalog.now()
  WHERE id = v_delivery.listing_id;
  INSERT INTO public.delivery_events (
    delivery_id, actor_id, actor_role, from_status, to_status, event_name, idempotency_key
  ) VALUES (
    p_delivery_id, p_volunteer_id, 'volunteer', 'awaiting_volunteer', 'assigned',
    'volunteer_assigned', 'accept_delivery:' || p_idempotency_key
  );
  v_response := pg_catalog.jsonb_build_object(
    'success', true, 'delivery_id', p_delivery_id, 'volunteer_id', p_volunteer_id,
    'status', 'assigned', 'replayed', false
  );
  INSERT INTO public.workflow_idempotency (
    actor_id, command_name, idempotency_key, resource_id, request_fingerprint, response
  ) VALUES (
    p_volunteer_id, 'accept_delivery', p_idempotency_key, p_delivery_id, v_fingerprint, v_response
  );
  RETURN v_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_delivery_location(
  p_delivery_id UUID,
  p_volunteer_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy_m NUMERIC,
  p_captured_at TIMESTAMPTZ,
  p_sequence BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delivery public.deliveries%ROWTYPE;
  v_latest public.delivery_locations%ROWTYPE;
  v_distance_m NUMERIC;
  v_elapsed_s NUMERIC;
  v_inserted public.delivery_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DELIVERY_NOT_FOUND';
  END IF;
  IF v_delivery.volunteer_id <> p_volunteer_id OR v_delivery.status NOT IN (
    'assigned', 'at_pickup', 'qc_passed', 'collected', 'en_route_dropoff', 'handed_over'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TRACKING_FORBIDDEN';
  END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180
     OR p_accuracy_m <= 0 OR p_accuracy_m > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_LOCATION';
  END IF;
  IF p_captured_at < pg_catalog.now() - INTERVAL '5 minutes'
     OR p_captured_at > pg_catalog.now() + INTERVAL '1 minute' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'STALE_LOCATION';
  END IF;

  SELECT * INTO v_latest FROM public.delivery_locations
  WHERE delivery_id = p_delivery_id ORDER BY sequence DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF p_sequence <= v_latest.sequence THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'STALE_SEQUENCE';
    END IF;
    v_elapsed_s := EXTRACT(EPOCH FROM (p_captured_at - v_latest.captured_at));
    IF v_elapsed_s < 5 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LOCATION_RATE_LIMITED';
    END IF;
    v_distance_m := 6371000 * 2 * pg_catalog.asin(pg_catalog.sqrt(
      pg_catalog.power(pg_catalog.sin(pg_catalog.radians((p_latitude - v_latest.latitude)::DOUBLE PRECISION) / 2), 2)
      + pg_catalog.cos(pg_catalog.radians(v_latest.latitude::DOUBLE PRECISION))
      * pg_catalog.cos(pg_catalog.radians(p_latitude::DOUBLE PRECISION))
      * pg_catalog.power(pg_catalog.sin(pg_catalog.radians((p_longitude - v_latest.longitude)::DOUBLE PRECISION) / 2), 2)
    ));
    IF v_elapsed_s > 0 AND v_distance_m / v_elapsed_s > 70 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IMPLAUSIBLE_LOCATION';
    END IF;
  END IF;

  INSERT INTO public.delivery_locations (
    delivery_id, volunteer_id, latitude, longitude, accuracy_m, captured_at, sequence
  ) VALUES (
    p_delivery_id, p_volunteer_id, p_latitude, p_longitude, p_accuracy_m, p_captured_at, p_sequence
  ) RETURNING * INTO v_inserted;
  RETURN pg_catalog.to_jsonb(v_inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.create_food_listing(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT[], TIMESTAMPTZ, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_food_listing(UUID, UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_delivery(UUID, UUID, TEXT, JSONB, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_delivery_location(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_food_listing(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT[], TIMESTAMPTZ, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_food_listing(UUID, UUID, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_delivery(UUID, UUID, TEXT, JSONB, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_delivery_location(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, BIGINT) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'delivery_locations'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_locations;
  END IF;
END $$;
