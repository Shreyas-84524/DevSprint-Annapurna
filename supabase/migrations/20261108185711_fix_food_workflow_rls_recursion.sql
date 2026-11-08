-- Break mutually-recursive RLS evaluation between food_listings and claims.
-- The helpers live outside exposed schemas, bind every lookup to auth.uid(),
-- and are executable only by authenticated callers. Their postgres owner can
-- read the protected tables without re-entering their RLS policies.

CREATE OR REPLACE FUNCTION internal.has_canonical_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = p_role
    );
$$;

CREATE OR REPLACE FUNCTION internal.can_read_food_listing(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.food_listings AS listing
      WHERE listing.id = p_listing_id
        AND (
          listing.donor_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.claims AS claim
            WHERE claim.listing_id = listing.id
              AND claim.requester_id = (SELECT auth.uid())
          )
          OR EXISTS (
            SELECT 1
            FROM public.deliveries AS delivery
            WHERE delivery.listing_id = listing.id
              AND delivery.volunteer_id = (SELECT auth.uid())
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role = 'admin'
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION internal.can_read_claim(p_claim_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.claims AS claim
      WHERE claim.id = p_claim_id
        AND (
          claim.requester_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.food_listings AS listing
            WHERE listing.id = claim.listing_id
              AND listing.donor_id = (SELECT auth.uid())
          )
          OR EXISTS (
            SELECT 1
            FROM public.deliveries AS delivery
            WHERE delivery.claim_id = claim.id
              AND delivery.volunteer_id = (SELECT auth.uid())
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role = 'admin'
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION internal.has_canonical_role(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION internal.can_read_food_listing(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION internal.can_read_claim(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION internal.has_canonical_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.can_read_food_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.can_read_claim(uuid) TO authenticated;

DROP POLICY IF EXISTS "food_listings_select_own" ON public.food_listings;
DROP POLICY IF EXISTS "food_listings_select_claimed" ON public.food_listings;
DROP POLICY IF EXISTS "food_listings_select_assigned" ON public.food_listings;
DROP POLICY IF EXISTS "food_listings_select_admin" ON public.food_listings;

CREATE POLICY "food_listings_select_participant"
  ON public.food_listings
  FOR SELECT
  TO authenticated
  USING ((SELECT internal.can_read_food_listing(food_listings.id)));

DROP POLICY IF EXISTS "claims_select_participant" ON public.claims;

CREATE POLICY "claims_select_participant"
  ON public.claims
  FOR SELECT
  TO authenticated
  USING ((SELECT internal.can_read_claim(claims.id)));

-- Recreate the insert policy without the retired profile-verification gate.
DROP POLICY IF EXISTS "food_listings_insert_donor" ON public.food_listings;

CREATE POLICY "food_listings_insert_donor"
  ON public.food_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = donor_id
    AND (SELECT internal.has_canonical_role('donor'))
  );
