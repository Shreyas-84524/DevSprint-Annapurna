# Project Status

Updated: 2026-11-07 (Asia/Calcutta)

## Overall

Current milestone: Stage 5 Supporting Features and Release Hardening

Code status: `REPAIRED — UNCOMMITTED FOR STAGE 6`

Evidence status: `APPLICATION CHECKS PASS`; real PostgreSQL/pgTAP execution remains pending.

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
| ESLint | Pass: 0 errors; 18 warnings |
| Automated tests | Pass: 221 tests across 64 suites |
| Production build | Pass: Next.js 16.2.4 Turbopack build; 49 pages generated |
| Diff hygiene | Pass: `git diff --check` |
| Security & Hardening | Pass: 0 TODOs, 0 production mocks/fake successes, no PII leakage |
| Role Canonicality | Pass: Persisted canonical roles strictly `donor`, `requester`, `volunteer`, `admin` |
| Real pgTAP database execution | Not run: no disposable/local PostgreSQL environment is available; migration scripts and pgTAP suite authored and ready for isolated database execution |

## Independent Audit Repair

The Stage 5 report was not accepted unchanged. The audit found that the frontend services parsed response fields not returned by the real API routes, contact throttling existed only in one process, clients could bypass the contact route and forge notifications directly, supporting CMS rows had no publication boundary, upload validation trusted declared MIME types, notification retries were not payload-bound, and blog content was rendered as unsanitized HTML.

The working tree now contains uncommitted repairs for those findings, including forward migration `20261107090001_stage5_audit_repairs.sql`. These changes are intentionally left uncommitted for the Stage 6 commit sequence. See `docs/audits/STAGE_5_AUDIT.md`.

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
