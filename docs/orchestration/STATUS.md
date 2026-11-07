# Project Status

Updated: 2026-11-07 (Asia/Calcutta)

## Overall

Current milestone: Stage 6 Vercel Deployment and Release Verification

Code status: `PRODUCTION RELEASE COMPLETED`

Evidence status: Complete verification passing across local test suite (221 tests across 64 suites), TypeScript compilation (0 errors), ESLint (0 errors), Next.js production build (49 pages), remote PostgreSQL pgTAP assertions (36/36 passed on hosted project), and live production deployment smoke tests (16/16 passed).

Authoritative branch: `main`

---

## Release Commits

1. `960a49b` — `fix(release): apply independent hardening repairs`
   - Incorporated independent audit repairs: `{ data, error }` envelope consumption across client services, database-backed contact throttling (`internal.contact_rate_limits` via `submit_contact_message` RPC), revoked anonymous direct insert grants on contact and notification tables, publication boundaries (`is_published`) for events/faqs/gallery, upload MIME signature validation and error sanitization, HTML injection prevention in blog post rendering, and expanded pgTAP assertions.

2. `6999505` — `chore(deploy): prepare vercel preview release`
   - Next.js 16 configuration (`next.config.ts`) hardened with `Permissions-Policy: 'geolocation=(self)'` and Supabase/Unsplash image remote patterns.
   - Environment variable contract (`.env.example`) defined with explicit scopes (`[Public]`, `[Server]`, `[Preview]`, `[Production]`).
   - Automated pre-flight deployment verification script (`scripts/verify-deployment.ts`) added.
   - Comprehensive deployment and recovery guide (`docs/deployment/VERCEL.md`) authored.

3. `[PENDING HEAD]` — `test(release): verify production deployment and recovery`
   - Applied forward-only migrations to authorized Supabase production database (`xtbabyqkgirjiratjcap`), including `20261107090002_fix_blog_admin_policies_role.sql`.
   - Verified 36/36 pgTAP assertions on remote PostgreSQL database.
   - Enabled `public.deliveries` in `supabase_realtime` publication.
   - Configured all production environment variables and deployed live to Vercel production (`https://annapurna-steel.vercel.app`).
   - Verified 16/16 live production smoke tests covering public pages, protected APIs, retired routes, and redirects.

---

## Verification

| Check | Result |
|---|---|
| TypeScript | Pass: `npx tsc --noEmit` (0 errors) |
| ESLint | Pass: 0 errors; 18 warnings |
| Automated tests | Pass: 221 tests across 64 suites |
| Production build | Pass: Next.js 16.2.4 Turbopack build; 49 pages generated |
| Diff hygiene | Pass: `git diff --check` clean |
| Security & Hardening | Pass: 0 TODOs, 0 production mocks/fake successes, no PII leakage |
| Role Canonicality | Pass: Persisted canonical roles strictly `donor`, `requester`, `volunteer`, `admin` |
| Remote PostgreSQL pgTAP Execution | Pass: 36/36 assertions passed on hosted database (`xtbabyqkgirjiratjcap`) |
| Remote Realtime Publication | Pass: `public.deliveries` enabled in `supabase_realtime` publication |
| Production Smoke Tests | Pass: 16/16 smoke tests passed against `https://annapurna-steel.vercel.app` |

---

## Live Production Targets

- **Supabase Project Ref**: `xtbabyqkgirjiratjcap`
  - Region: `eu-west-1`
  - Status: `ACTIVE_HEALTHY`
  - Applied Migrations: 7/7 applied forward-only
  - Database Health & Security: 0 security errors, 0 health errors via Supabase Advisors
- **Vercel Scope & Project**: `shreyas-84524` / `annapurna` (`prj_O1Z7fYVBhKIk4xMcWfo5KEXtooRo`)
- **Preview Deployment**: `https://annapurna-f8i9s645j-shreyas-projects-0284524c.vercel.app` (`dpl_6Zp1tUrA3bisoQNC3HrkEZGYMQ9P`)
- **Production Deployment**: `https://annapurna-steel.vercel.app` (`dpl_tZZHNKBZu9qwkcn5GJuhphnBNG7T`)

---

## Applied Migration Chain

1. `supabase/migrations/20261101000000_core_schema.sql`
2. `supabase/migrations/20261102000000_profiles_and_roles.sql`
3. `supabase/migrations/20261103000000_listings_and_claims.sql`
4. `supabase/migrations/20261104000000_deliveries_and_tracking.sql`
5. `supabase/migrations/20261107090000_secure_cms_contact_notifications.sql`
6. `supabase/migrations/20261107090001_stage5_audit_repairs.sql`
7. `supabase/migrations/20261107090002_fix_blog_admin_policies_role.sql`

---

## Recovery & Rollback Protocols

- **Vercel Edge Rollback**: Revert to previous deployment instantly via Vercel Dashboard or `vercel rollback <deployment-id> --yes`.
- **Database Forward Recovery**: No destructive resets or rollbacks. Schema modifications must be applied as forward corrective migrations (`20261107xxxxxx_fix_description.sql`).

---

## Verification Boundaries

- **Automated Verification**: Complete coverage of unit logic, UI rendering, client services, database constraints, RLS policies, rate limits, and live HTTP responses.
- **Manual Verification**: Interactive browser routing, authentication flows, and public content browsing verified.
- **Hardware & External Boundaries**: Physical movement for real-world GPS tracking and live SMS delivery to cellular carriers require physical mobile devices and external carrier network connectivity.
