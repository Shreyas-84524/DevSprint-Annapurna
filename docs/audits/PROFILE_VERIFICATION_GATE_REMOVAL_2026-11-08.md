# Profile Verification Gate Removal Audit

Date: 2026-11-08

## Decision

Donor and requester account/profile verification is no longer an access or workflow condition. A signed-in user with the canonical role and required operational profile/location data can enter the matching dashboard, publish food listings, and claim food.

This change does not remove Supabase authentication, canonical role authorization, ownership checks, workflow-state validation, idempotency, concurrency protection, RLS, food quality control, or delivery receipt confirmation.

## Root cause

The recurring `Profile Verification Required` page was not a single component. The legacy `is_verified` flag was enforced independently in the donor/requester pages, Next.js proxy redirects, login and `/api/me` routing projections, listing/claim Route Handlers, server services, and active Postgres workflow functions. Removing only the visible page would have left API and database operations blocked.

## Corrected surfaces

- Donor and requester dashboards no longer select or gate on `is_verified`.
- Onboarding no longer presents donor/requester account-verification badges or verification-gate copy.
- Proxy and post-login routing use the canonical role once a profile exists.
- `/api/me` treats an existing canonical profile as onboarded independently of the legacy flag.
- Listing create/publish and claim handlers/services authorize by authenticated canonical role and workflow invariants.
- Forward migration `20261108114130_remove_profile_verification_gate.sql` removes the legacy predicates from the active `create_food_listing` and `claim_food_listing` functions without rewriting migration history.
- Legacy verification fields remain informational compatibility data and are not trusted for access decisions.

## Validation

- Integrated automated suite: 250 passed, 0 failed.
- TypeScript: passed.
- Targeted ESLint: passed with no warnings or errors.
- `git diff --check`: passed.
- Next.js 16.2.4 production webpack build: passed.

## Deployment condition

Application code and the database migration must both be deployed. The checkout did not have authenticated access to the hosted Supabase project referenced by the application, so the migration could not be applied during this audit. Until it is applied through that project's SQL editor, a project-scoped linked CLI session, or Supabase MCP, old hosted database functions may continue to reject profiles whose legacy flag is false even after the page and API correction is deployed.
