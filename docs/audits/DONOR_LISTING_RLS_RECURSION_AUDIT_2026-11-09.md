# Donor Listing RLS Recursion Audit

Date: 2026-11-09

## Observed failure

The authenticated donor dashboard rendered, but listing retrieval failed and the UI incorrectly reported a network/offline problem.

Local runtime evidence identified PostgreSQL error `42P17`: `infinite recursion detected in policy for relation "food_listings"`.

## Root cause

`food_listings_select_claimed` queried `claims`, while `claims_select_participant` queried `food_listings`. PostgreSQL applied RLS to both nested reads, re-entered the first policy, and aborted the query. The browser then classified every query exception as an offline failure. A separate React warning was caused by empty or duplicate listing IDs reaching keyed rendering.

## Correction

- Forward migration `20261108185711_fix_food_workflow_rls_recursion.sql` replaces the recursive policy chain with non-exposed `internal` participant helpers.
- Helpers use `SECURITY DEFINER`, an empty `search_path`, explicit `auth.uid()` checks, and authenticated-only execution grants.
- The active listing-insert policy retains canonical donor authorization without the retired `is_verified` condition.
- `GET /api/listings?mine=true` verifies the cookie-backed session and canonical donor role, uses the server-only service client, explicitly filters `donor_id` to the authenticated user, and returns safe `ListingDTO` fields only.
- The donor dashboard consumes this endpoint instead of reading `food_listings` directly from the browser.
- Frontend handling now distinguishes authentication, authorization, server, invalid-contract, and actual offline failures. Empty or duplicate listing IDs are rejected before rendering.

## Validation

- Integrated automated suite: 262 passed, 0 failed.
- TypeScript: passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.
- Next.js 16.2.4 production webpack build: passed.
- Local unauthenticated endpoint check returned the expected `401 UNAUTHORIZED`, confirming the route is active and protected.
- The added pgTAP regression could not run because the local Docker engine was unavailable.

## Deployment condition

The application fix works locally before the database migration because the server endpoint performs explicit session, role, and ownership checks before its server-only read. The forward RLS migration must still be applied to the intended hosted Supabase project before production deployment so direct participant reads elsewhere do not encounter the recursive policy chain.
