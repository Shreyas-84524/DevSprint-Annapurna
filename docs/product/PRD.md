# Annapurna Product Requirements

Status: authoritative active PRD
Updated: 2026-11-08

## Product statement

Annapurna coordinates time-sensitive surplus food from donors to requesters through volunteers. The MVP optimizes for safety, privacy, atomic assignment, clear recovery, and a demonstrable end-to-end journey on free service tiers.

## Personas

### Donor

Registers and signs in with email and password, completes onboarding, records a pickup location, publishes and manages food listings, and observes claim and delivery progress.

### Requester

Registers and signs in with email and password, completes onboarding, records a delivery location, discovers nearby listings, claims one whole listing, observes authorized delivery progress, and confirms receipt.

### Volunteer

Uses normal authentication, opts into delivery work, accepts one delivery, performs food QC, records collection and handover, and shares bounded GPS updates only during an active delivery. No extra OTP or approval gate applies.

### Admin

Is created only through a secure bootstrap process. Admin manages retained CMS and authorized operational exceptions. Admin is not a public-signup role.

## Functional requirements

### Identity and onboarding

- One role per account.
- Donor/requester sessions use Supabase email/password authentication. Canonical role and onboarding state are resolved server-side and cannot be changed by choosing a different login portal.
- A separate account/profile verification flag does not gate donor or requester dashboards, listing publication, or claims. Authentication, canonical role, ownership, workflow state, and required location data remain enforced.
- Canonical role mutations and other privileged account changes require trusted server-side operations with audit records.
- Location entry supports map pin, manual correction, browser location permission, denial, and retry.

### Listings and discovery

- Donors create draft/published listings with description, food category, quantity display, expiry, pickup location, and optional bounded image upload.
- Public discovery exposes only safe approximate location data.
- Expired, claimed, cancelled, failed-QC, and completed listings cannot be claimed.
- Nearby results use a documented radius and deterministic ordering with pagination.

### Claims and delivery

- Claiming creates one active claim and delivery in one transaction.
- Volunteer acceptance is conditional on both delivery availability and volunteer capacity.
- The backend owns transitions; browser clients request actions rather than updating status columns directly.
- QC pass enables collection. QC failure closes the human-delivery path and invokes the documented rejection/recovery outcome.
- Handover and requester confirmation are distinct actions.

### Maps and tracking

- Leaflet renders a policy-compliant free basemap, participant markers, and cached OpenRouteService routes.
- Routing requests are separate from frequent GPS updates.
- GPS updates are frequency- and distance-bounded, authorized, persisted, and stopped at terminal states.
- Reconnect restores server-persisted state; stale-location UI identifies age.

### Notifications and CMS

- In-app notifications cover meaningful workflow transitions.
- Blog, events, FAQ, gallery, and contact-message functionality is reconnected after the core flow.

## Non-functional requirements

- RLS on every Data API-exposed table; explicit grants and policies are separate concerns.
- No authorization decision uses user-editable metadata.
- Sensitive values are never logged or returned in broad DTOs.
- Route handlers and database functions re-check authentication, authorization, transition preconditions, and idempotency.
- Mobile-first responsive UI, keyboard access, useful focus states, and explicit loading/error/empty/reconnect states.
- Vercel-compatible stateless server behavior and deliberate, reproducible Supabase migrations.
- Free plans are used only after current quotas and policy suitability are verified and documented.

## Success criteria

- Automated negative tests prove role isolation and concurrency invariants.
- A Preview deployment completes the core journey with its commit, migration state, environment, and URL recorded.
- The user completes a separately recorded manual checklist.
- No critical or high code-audit finding remains unresolved for release.

## Legacy decisions superseded

Monetary donation/payment flows, wallet/earnings logic, Aadhaar/UPI collection, volunteer compensation, tax receipts, NGO management, and manual volunteer approval are not MVP requirements. The former multipart PRD/MVP/architecture files were removed from active documentation and remain recoverable in Git history.
