# Annapurna API Contracts

Status: Stage 1 contract baseline. Contract changes require Codex review; backend is the sole code editor for shared contract types.

## Conventions

- JSON responses use `{ "data": ..., "error": null, "meta": ... }` or `{ "data": null, "error": { "code": "...", "message": "...", "details": ... } }`.
- Mutation requests require authenticated Supabase sessions. Authorization is rechecked on the server and in the database.
- Retryable commands accept `Idempotency-Key`; replay returns the original logical result.
- Validation errors are `400`, unauthenticated `401`, unauthorized `403`, not found `404`, transition/concurrency conflicts `409`, expired resources `410`, rate limits `429`, and dependency failures `502`/`503`.
- Clients never send trusted role, owner, assignee, or transition-state fields.
- Coordinates are WGS84 decimal latitude/longitude. Timestamps are UTC ISO 8601.

## Identity and onboarding

| Method and path | Request | Result |
|---|---|---|
| `POST /api/auth/signup` | `{ email, password, role: donor\|requester\|volunteer }` | Creates a Supabase email/password account; public admin signup is rejected |
| `POST /api/auth/login` | `{ email, password, portalRole? }` | Establishes the cookie-backed session and returns the canonical role and role-safe redirect URL |
| `POST /api/auth/forgot-password` | `{ email }` | Requests a password-recovery email and returns a neutral response that does not disclose account existence |
| `POST /api/auth/update-password` | `{ password }` | Updates the password for an authenticated recovery session |
| `POST /api/auth/logout` | none | Signs out Supabase session and clears HTTP-only auth cookies |
| `POST /api/onboarding/profile` | `{ role: donor\|requester\|volunteer, displayName, location }` | Creates the one-time canonical profile with base location; rejects `admin` |
| `GET /api/me` | none | Minimal canonical role, onboarding, and dashboard-routing DTO; any legacy verification field is informational and never gates access |
| `PUT /api/me/locations/:id` | Label and map pin | Upserts only the caller's location |

Email/password authentication is managed by Supabase Auth. Session cookies are written by the server boundary through `@supabase/ssr`. After login the browser performs a validated full-document navigation to the canonical role destination so the protected request observes the committed cookie and cannot reuse a stale unauthenticated App Router response. Role selection in the browser never changes the canonical profile role.

## Listings and discovery

| Method and path | Request | Result |
|---|---|---|
| `POST /api/listings` | Description, food metadata, expiry, saved pickup location ID, optional prepared image token | Donor-owned draft or published listing |
| `PATCH /api/listings/:id` | Allowed donor-editable fields with version | Updated listing or `409` if no longer editable |
| `POST /api/listings/:id/publish` | Idempotent command | Published listing after authenticated donor authorization and listing validation |
| `GET /api/listings/nearby?lat=&lng=&radius=&cursor=` | Discovery query | Public-safe summaries; never exact pickup details |
| `POST /api/listings/:id/claim` | `{ deliveryLocationId }` plus idempotency key | Atomically creates active claim and awaiting delivery, or `409/410` |

## Delivery commands

| Method and path | Request | Result |
|---|---|---|
| `GET /api/volunteer/tasks/available` | Cursor and optional proximity | Safe available-task summaries |
| `POST /api/deliveries/:id/accept` | Idempotency key | Atomically assigns caller if delivery and volunteer are available |
| `POST /api/deliveries/:id/arrive-pickup` | Idempotency key | `assigned -> at_pickup` |
| `POST /api/deliveries/:id/qc` | `{ result: pass|fail, notes? }` | Creates QC record and transitions to `qc_passed` or `qc_failed` |
| `POST /api/deliveries/:id/collect` | Idempotency key | `qc_passed -> collected` |
| `POST /api/deliveries/:id/start-dropoff` | Idempotency key | `collected -> en_route_dropoff` |
| `POST /api/deliveries/:id/handover` | Optional safe evidence metadata | `en_route_dropoff -> handed_over` |
| `POST /api/deliveries/:id/confirm-receipt` | Idempotency key | Requester-only `handed_over -> receipt_confirmed` |
| `POST /api/deliveries/:id/cancel` | `{ reasonCode, note? }` | Allowed actor/state cancellation with recovery result |
| `GET /api/deliveries/:id` | none | Participant-filtered canonical state and allowed next actions |

Every transition checks actor, canonical role, current state, ownership/assignment, idempotency, and row version inside one transaction. Account/profile verification status is not an authorization condition.

## Tracking and routing

| Method and path | Request | Result |
|---|---|---|
| `PUT /api/deliveries/:id/location` | `{ lat, lng, accuracyM, capturedAt, sequence }` | Assigned volunteer only; bounded/stale/terminal updates rejected |
| `GET /api/deliveries/:id/tracking` | none | Authorized latest location with age/stale indicator |
| `GET /api/deliveries/:id/route?leg=pickup|dropoff` | none | Authorized cached GeoJSON route and provider timestamp |

Realtime channels communicate only delivery IDs and safe authorized payloads. Reconnect always obtains `GET /api/deliveries/:id` before resuming.

## Notifications and retained CMS

- `GET /api/notifications`, `POST /api/notifications/:id/read`.
- Public CMS reads may use direct RLS-safe queries or Route Handlers; admin mutations require admin authorization close to the data source.
- `POST /api/contact` validates and rate-limits contact messages.

## Frontend integration obligations

The frontend consumes these contracts, renders conflict/expiry/permission/reconnect errors, and does not perform direct multi-table workflow writes. Any proposed contract change is documented in the worker handoff and must be accepted before either workstream relies on it.
