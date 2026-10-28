# Annapurna Architecture

Status: proposed Stage 1 target; implementation not yet verified

## Runtime boundaries

- Next.js 16 App Router on Vercel renders UI and hosts authenticated Route Handlers under `src/app/api`.
- Supabase provides Auth, Postgres, Storage, Realtime, RLS, and transactional database functions.
- The existing Swift service remains the OTP issuer/verifier. Annapurna calls Swift only from server code using `SWIFT_BASE_URL` and `SWIFT_PROJECT_KEY`; browser code calls Annapurna endpoints and never receives the Swift key.
- Leaflet renders maps in the browser. OpenRouteService supplies routes through a server-side adapter and cache.

The installed Next.js 16.2.4 documentation was consulted. Route Handlers are public HTTP endpoints and must perform authorization. Authorization should be close to the data source through a server-only data-access layer. The current `middleware.ts` convention is deprecated in this installed version in favor of `proxy.ts`; migration is an implementation task, not a Stage 1 Codex edit.

## Trust model

Browser clients are untrusted. They may request actions but may not set role, verification state, claim owner, assigned volunteer, workflow status, earnings, or administrative fields. RLS remains defense in depth; atomic database functions enforce cross-row invariants.

Public listing DTOs exclude exact pickup details. Exact pickup information becomes available only to the assigned volunteer during an allowed delivery state. Requester delivery details and volunteer tracking are restricted to the requester, assigned volunteer, relevant donor where required, and admins with an audited operational need.

## Application layers

1. `src/app` pages/layouts: rendering and route composition.
2. `src/components`, `src/hooks`, and browser clients: frontend-owned interaction layer.
3. `src/server`: server-only session verification, authorization, services, DTO projection, validation, routing adapter, and privileged operations.
4. `src/app/api`: thin backend-owned HTTP adapters over server services.
5. `supabase`: reproducible migrations, seed data, RLS, storage policies, triggers, and transactional functions.
6. `src/types/contracts.ts`: backend-owned shared request/response/status definitions consumed by frontend.

## Authentication and verification

Supabase Auth establishes the account session. A server-side onboarding operation writes the canonical role once. For donor/requester phone verification, Annapurna sends through Swift `/api/v1/otp/send`, stores the returned request ID and normalized E.164 phone in a server-side pending session, and verifies through `/api/v1/otp/verify`. The client supplies only the code within the same pending session; it cannot replace the authoritative phone or request ID. Successful verification creates an application verification record and consumes the pending session. OTP values and Swift keys are never persisted in application tables or logs.

Admin bootstrap is out-of-band and documented. Public clients cannot select or grant admin.

## Workflow architecture

Claims, delivery creation, volunteer acceptance, QC, collection, handover, receipt confirmation, cancellation, and rejection use authenticated commands with allowed-transition checks. Claim and acceptance functions lock or conditionally update the relevant rows and return conflicts deterministically. An idempotency key protects retries.

Realtime broadcasts persisted state changes. Clients re-fetch authorized canonical state after reconnect; Realtime messages are hints, not the source of truth.

## Mapping architecture

The browser captures map pins and foreground GPS permission. A backend routing adapter calls current OpenRouteService endpoints, stores bounded route-cache entries, and never couples route calculation to every GPS update. Basemap attribution and provider usage policy must remain visible. Background browser tracking limitations are user-facing.

## Deployment architecture

Vercel functions remain stateless and do not host a custom persistent WebSocket server. Supabase Realtime supplies authorized updates. Migrations run deliberately outside the application build. Preview is audited before production. Secrets are server-only; only publishable Supabase values are browser-exposed.

## Decisions pending evidence

- Pending verification session storage/TTL implementation and live Swift gateway validation.
- Dedicated Supabase project identity and region.
- Retention period for detailed tracking points.
- Exact nearby radius and route-cache TTL.
- Current free-tier quotas for Supabase, Vercel, basemap, and routing providers at Stage 6.
