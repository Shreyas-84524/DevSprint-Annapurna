-- Account/profile verification is retained as legacy informational data only.
-- Authentication, canonical role, ownership, location, workflow-state, and
-- idempotency checks remain authoritative. These function replacements remove
-- only the is_verified predicates from the active food workflow functions.

DO $migration$
DECLARE
  v_definition text;
  v_updated_definition text;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.create_food_listing(uuid,text,text,numeric,text,text,text[],timestamptz,uuid,boolean,text)'::regprocedure
  )
  INTO v_definition;

  v_updated_definition := pg_catalog.replace(
    v_definition,
    ' OR NOT v_profile.is_verified',
    ''
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Expected create_food_listing verification predicate was not found';
  END IF;

  EXECUTE v_updated_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.claim_food_listing(uuid,uuid,uuid,text)'::regprocedure
  )
  INTO v_definition;

  v_updated_definition := pg_catalog.replace(
    v_definition,
    ' OR NOT v_requester.is_verified',
    ''
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Expected claim_food_listing verification predicate was not found';
  END IF;

  EXECUTE v_updated_definition;
END;
$migration$;

COMMENT ON FUNCTION public.create_food_listing(
  uuid, text, text, numeric, text, text, text[], timestamptz, uuid, boolean, text
) IS 'Creates a food listing for an authenticated canonical donor; legacy profile verification status is not an authorization condition.';

COMMENT ON FUNCTION public.claim_food_listing(uuid, uuid, uuid, text)
IS 'Claims a food listing for an authenticated canonical requester; legacy profile verification status is not an authorization condition.';
