# Annapurna Data Model

Status: contract-level proposal; backend worker must validate against current Supabase capabilities and produce migrations

## Canonical roles

`donor`, `requester`, `volunteer`, `admin`. `beneficiary` is legacy UI terminology only and must not be a second persisted role value.

## Core entities

| Entity | Purpose | Important invariants |
|---|---|---|
| `profiles` | One application profile per Auth user | One immutable MVP role; no client role updates |
| `verification_records` | Trusted donor/requester verification evidence | Distinct from food QC; privileged writes only; no OTP storage |
| `saved_locations` | User-owned labelled map pins | Exact coordinates visible only to owner and authorized workflow participants |
| `volunteer_preferences` | Availability and delivery preferences | No manual approval flag |
| `food_listings` | Public-safe listing state | One donor; positive quantity display; expiry enforced server-side |
| `listing_pickup_details` | Exact private pickup instructions/location | One-to-one with listing; never in public discovery DTO |
| `listing_images` | Optional bounded images | Storage owner/path/type/size enforced |
| `claims` | Requester claim of a whole listing | Unique active claim per listing; one requester |
| `deliveries` | Fulfilment state joining listing, claim, requester, donor, volunteer | One assigned volunteer; one active delivery per volunteer |
| `quality_checks` | Pickup food QC evidence | Volunteer and timestamp; separate from identity verification |
| `delivery_events` | Append-only transition/audit history | Actor, prior/new state, reason, idempotency key |
| `tracking_latest` | Latest authorized volunteer position | One row per active delivery; updated with bounded frequency |
| `tracking_points` | Optional short-retention persisted trail | Retention unresolved; participant-only read |
| `route_cache` | Provider route response and expiry | Keyed by normalized endpoints/profile; not rewritten for each GPS event |
| `notifications` | In-app user notifications | User-owned reads; server-created workflow notifications |
| CMS/contact tables | Retained blog, event, FAQ, gallery, contact data | Admin writes, appropriate public reads |

## State values

Listing: `draft`, `published`, `claimed`, `in_delivery`, `completed`, `expired`, `cancelled`, `rejected_qc`.

Claim: `active`, `cancelled`, `fulfilled`.

Delivery: `awaiting_volunteer`, `assigned`, `at_pickup`, `qc_passed`, `qc_failed`, `collected`, `en_route_dropoff`, `handed_over`, `receipt_confirmed`, `cancelled`.

Terminal delivery states are `qc_failed`, `receipt_confirmed`, and `cancelled`.

## Required database protections

- Foreign keys for every ownership and workflow relationship.
- Check constraints for states, coordinate ranges, and bounded text/size metadata.
- Partial unique index for one active claim per listing.
- Partial unique index for one active delivery per volunteer.
- Unique idempotency key scoped to actor and command.
- Indexes on ownership columns, listing publication/expiry, geospatial discovery representation, delivery volunteer/state, and notification user/read state.
- RLS on every exposed table with ownership/participant predicates; `TO authenticated` alone is insufficient.
- Update policies include both `USING` and `WITH CHECK`; protected columns also require server/database enforcement.
- Privileged functions live in a non-exposed schema, revoke default `PUBLIC` execute, set a safe `search_path`, authenticate internally, and grant narrowly.
- Views exposed to clients use `security_invoker = true` where supported.

## Migration approach

The repository currently uses imperative files under `supabase/migrations`. The backend worker must inspect the CLI version and help before creating a migration. Existing migrations are not a safe production baseline: they contain broad reads/writes, deprecated `auth.role()` checks, role creation from user-editable metadata, Aadhaar/UPI/earnings fields, and conflicting role sets. Stage 2 must produce a reproducible clean path and migration tests without modifying an unrelated Supabase project.

## Unresolved

PostGIS availability and whether nearby discovery uses geography or a bounded alternative; tracking retention; exact OTP evidence fields; cancellation reasons; and which legacy CMS columns are retained.
