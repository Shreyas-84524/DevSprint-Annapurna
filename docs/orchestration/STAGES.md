# Six-Stage Delivery Plan

Exactly six stages are used. Dependent work advances only after its exit evidence passes.

## Stage 1 — Discovery, documentation, and contracts

Codex verifies repository state and checks, replaces legacy active plans, publishes contracts/ownership/prompts, and audits existing claims. Frontend inventories routes, data dependencies, mocks, reusable components, and broken flows. Backend verifies Supabase MCP authentication/project identity without changes and documents the existing OTP integration dependency.

Exit: verified baseline, contracts/ownership agreed, dedicated backend path identified, human dependencies explicit.

## Stage 2 — Backend foundation and onboarding

Backend establishes a dedicated reproducible Supabase foundation, profile/role/verification/location/preferences model, secure admin bootstrap, and server-side OTP proof enforcement. Frontend implements role-aware auth/onboarding, OTP integration UI for donor/requester, volunteer onboarding without extra verification, location permission/manual entry, and states.

Exit: role dashboards route correctly; verification and unauthorized-access tests pass; fresh database initializes reproducibly.

## Stage 3 — Listings, claims, and assignment

Backend implements listings/private pickup/images, expiry/nearby discovery, atomic idempotent claims and delivery acceptance. Frontend connects listing CRUD/upload, discovery/claim, volunteer task acceptance, and conflict/expiry/unavailable states.

Exit: donor publish -> requester claim -> volunteer accept works; concurrency cannot duplicate ownership.

## Stage 4 — Mapping, QC, tracking, and completion

Backend implements QC/transition rules, route adapter/cache, authorized persisted tracking, cancellation/rejection/recovery, handover, and requester confirmation. Frontend implements markers/routes, bounded foreground GPS, QC/collection/handover/confirmation, stale/denied/reconnect/provider-failure states.

Exit: full journey and negative authorization paths pass; reconnect restores persisted state. Browser background limitations are documented.

## Stage 5 — Supporting features and hardening

Backend reconnects CMS/contact/notifications and reviews RLS, sensitive projections, uploads, and admin actions. Frontend reconnects CMS pages, consolidates food-focused navigation, removes production mocks/dead actions, and fixes essential accessibility/mobile/error states. Codex runs integration, retry, expiry, and recovery audits and correction loops.

Exit: retained features and core code verification pass; no unresolved critical/high release finding; manual checklist and limitations published.

## Stage 6 — Vercel deployment and release verification

Backend makes runtime/configuration Vercel-compatible, documents Preview/Production variable scopes, Supabase redirects/storage/Realtime, and deliberate migration procedure. Frontend verifies deployed auth/upload/maps/GPS/tracking/responsiveness. Codex verifies current official service documentation and free-plan suitability, audits Preview first, and records commit/environment/migration/URL, rollback, and manual results.

Exit: deployed workflow passes available checks; manual status is separate; external/device checks remain explicitly unverified; production readiness is distinct from code and Preview completion.
