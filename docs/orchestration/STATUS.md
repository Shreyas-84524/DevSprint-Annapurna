# Project Status

Updated: 2026-11-07 (Asia/Calcutta)

## Overall

Current milestone: Stage 6 Vercel Deployment and Release Verification

Code status: `PREPARING PREVIEW RELEASE`

Evidence status: Application checks pass (221 tests, 0 TS errors, 0 lint errors, build succeeded). Real PostgreSQL/pgTAP execution blocked locally on Docker daemon; awaiting user authorization for safe non-production target.

Authoritative branch: `main`

---

## Release Commits

1. `960a49b` — `fix(release): apply independent hardening repairs`
   - Incorporated independent audit repairs: `{ data, error }` envelope consumption across client services, database-backed contact throttling (`internal.contact_rate_limits` via `submit_contact_message` RPC), revoked anonymous direct insert grants on contact and notification tables, publication boundaries (`is_published`) for events/faqs/gallery, upload MIME signature validation and error sanitization, HTML injection prevention in blog post rendering, and expanded pgTAP assertions.

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
| Real pgTAP database execution | Blocked: Docker daemon is not running on local machine (`dial error ECONNREFUSED 127.0.0.1:54322`); awaiting user authorization for safe non-production target |

---

## Deployment Configuration & Vercel Readiness

- **Next.js Config (`next.config.ts`)**: Configured `Permissions-Policy: 'geolocation=(self)'` to enable browser location for donor onboarding and volunteer GPS tracking. Configured `images.remotePatterns` for `*.supabase.co` and `images.unsplash.com`.
- **Environment Template (`.env.example`)**: Documented all public and server-only variables with explicit environment scopes (`Preview`, `Production`).
- **Pre-Flight Verification Script (`scripts/verify-deployment.ts`)**: Automated validation of environment variables without leaking secret values.
- **Vercel Deployment Guide (`docs/deployment/VERCEL.md`)**: Full documentation of stateless runtime, Supabase Auth redirect URLs, Storage bucket policies, Realtime publication, and forward-only migration recovery protocol.

---

## Database & External Deployment Gates

Per strict release protocols:
1. Migrations are NEVER run automatically during Vercel builds.
2. Hosted database migrations and Vercel deployments require explicit user approval with targets and scopes specified.
3. Production database must never be used as a disposable test database.
