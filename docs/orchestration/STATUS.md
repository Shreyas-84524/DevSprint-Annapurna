# Project Status

Updated: 2026-11-07 (Asia/Calcutta)

## Overall

Current milestone: Stage 5 Supporting Features and Release Hardening

Code status: `COMPLETE`

Evidence status: `VERIFIED` across 220 automated unit, API, UI, and integration tests; production build and static verification passing.

Authoritative branch: `main`

## Stage 5 Commits

1. `feat(support): secure CMS contact and notifications`
   - Backend schema, forward-only migration (`20261107090000_secure_cms_contact_notifications.sql`), RLS, least-privilege grants, server APIs, admin authorization close to data source, upload security (`cms-assets` bucket), contracts, and 35 backend tests.
2. `feat(ui): reconnect supporting experiences`
   - Reconnected public CMS experiences (Blogs, Events, FAQs, Gallery, Contact), in-app notification bell with unread count badge, admin CMS command center, navigation consolidation, accessibility enhancements, responsive layouts, and 16 frontend tests.
3. `test(release): harden integration and recovery paths`
   - Cross-feature integration tests, deterministic notification deduplication, contact rate limiting, sensitive projection isolation, legacy monetization cleanup (`/donate` and `/sponsor` redirects, checkout retirement), and status documentation.

## Verification

| Check | Result |
|---|---|
| TypeScript | Pass: `npx tsc --noEmit` (0 errors) |
| ESLint | Pass: 0 errors; 10 pre-existing/benign warnings |
| Automated tests | Pass: 220 tests across 64 suites |
| Production build | Pass: Next.js 16.2.4 Turbopack build |
| Diff hygiene | Pass: `git diff --check` |
| Security & Hardening | Pass: 0 TODOs, 0 production mocks/fake successes, no PII leakage |
| Role Canonicality | Pass: Persisted canonical roles strictly `donor`, `requester`, `volunteer`, `admin` |
| Real pgTAP database execution | Not run: no disposable/local PostgreSQL environment is available; migration scripts and pgTAP suite authored and ready for isolated database execution |

## Completed Scope

- **CMS & Contact Backend**: Reconnected Blog, Event, FAQ, Gallery, and Contact infrastructure to authenticated PostgreSQL tables via a forward-only migration with row-level security.
- **In-App Notifications**: Implemented `notifications` table, DAL, API endpoints (`GET /api/notifications`, `POST /api/notifications/[id]/read`), and UI bell with unread badge and optimistic read updates.
- **Workflow Notifications**: Automated idempotent notification dispatch on listing claims and delivery lifecycle milestones (assignment, pickup arrival, QC pass/fail, dropoff start, handover, receipt confirmation, cancellation).
- **Hardened Admin Authorization**: Mutations enforced server-side via `internal.is_admin()` and role checks on authenticated caller profiles.
- **Contact Confidentiality & Rate Limiting**: Visitor messages are strictly non-enumerable publicly; submissions are validated, normalized, and rate limited to 5 submissions/hour.
- **Retired Legacy Monetization & Mocks**: Purged Razorpay mock checkout, fake sponsor delays, and volunteer compensation copy; converted `/donate` and `/sponsor` to clean redirects to the core food redistribution workflow (`/dashboard/donor`).
- **Accessibility & Responsive Polish**: Added visible focus rings (`focus-visible:ring-2 focus-visible:ring-brand-gold`), semantic landmarks, dialog ARIA attributes, keyboard escape listeners, and validated horizontal overflow resilience across viewport sizes.

## Remaining External Gates (Stage 6 / Deployment Milestone)

1. Replay all migrations on a disposable Supabase/PostgreSQL environment and run `supabase test db`.
2. After explicit user approval, reconcile and apply pending migrations to the hosted Supabase project.
3. Vercel Preview and Production deployments belong strictly to Stage 6 release operations.

## Human Action Required

- Do not apply pending migrations to the hosted project without explicit user approval.
- Do not trigger live SMS deliveries without user authorization.
- Keep server-only keys in local/deployment secret storage; never commit secrets.
