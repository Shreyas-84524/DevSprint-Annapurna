# Stage 1 Baseline Audit

Audit date: 2026-10-28
Comparison base: `d2e1dd17d54245b9ade0bd7a5b46b9e568acdd8e`

## Repository evidence

`main` tracks `origin/main`. Pre-existing working changes are `src/context/FoodContext.tsx` and `src/lib/supabase.ts`; untracked `.agents/`, `audit-reports/`, `navigation.html`, and `skills-lock.json` also predate this documentation pass. Codex preserved them. Legacy planning files removed in this pass were tracked and remain recoverable from Git history. Historical `audit-reports/` evidence was preserved.

## Executed checks

- `npx tsc --noEmit`: PASS, exit 0.
- `npm run lint`: PASS, exit 0, 29 warnings (unused values, hook dependencies, and `img` optimization).
- `npm run build`: initial sandbox run failed because Google Fonts could not be fetched; approved network run PASS, exit 0, 30 routes, with the Next.js 16 `middleware` -> `proxy` deprecation warning.
- `npm test`: FAIL/ABSENT because `package.json` has no test script or configured suite.
- `git diff --check`: no whitespace error; line-ending warnings on the two pre-existing modified files.

## Verified findings

### S1-01 — Critical — role and protected-field escalation

Affected: `supabase/migrations/20260703000001_auth_triggers.sql`, `public.handle_new_user`, users update policy. Expected: role/verification are server-controlled. Observed: role is copied from user-editable signup metadata and the own-profile update policy does not protect `role`/`earnings`. Evidence: static SQL inspection. Owner: Backend. Acceptance: public signup cannot create admin or change role/verification/protected fields; negative database/API tests pass.

### S1-02 — Critical — non-atomic claim and assignment

Affected: `src/app/dashboard/beneficiary/page.tsx` claim handler and `src/app/dashboard/volunteer/page.tsx` acceptance handlers. Expected: one active claim/listing and one volunteer/delivery despite races/retries. Observed: separate browser-side insert/update operations with no conditional state predicate or uniqueness invariant. Owner: Backend for atomic command, Frontend for API adoption. Acceptance: concurrency tests prove one winner and deterministic `409` losers; retries are idempotent.

### S1-03 — High — admin route lacks role authorization

Affected: `src/middleware.ts`. Expected: admin access is verified near the data source and on every admin mutation. Observed: only session existence is checked for `/admin`. Owner: Backend. Acceptance: non-admin authenticated users receive `403`/redirect and cannot call admin mutations; tests cover all roles.

### S1-04 — High — broad RLS and sensitive exposure

Affected: existing migrations. Expected: participant/owner policies and safe DTOs. Observed: `USING (true)` for user, donation, request, and settings reads; deprecated `auth.role()` checks; public contact insert without documented abuse controls. Owner: Backend. Acceptance: role/participant matrix tests, explicit grants, RLS advisors reviewed, sensitive fields absent from unauthorized results.

### S1-05 — High — geolocation disabled and map disconnected

Affected: `next.config.ts`, `src/app/dashboard/volunteer/page.tsx`, `src/components/map/MapView.tsx`. Expected: foreground same-origin geolocation and participant markers/routes. Observed: Permissions-Policy sets `geolocation=()` and dashboard renders `<DynamicMap />` without coordinates. Owner: Backend for runtime header, Frontend for GPS/map. Acceptance: permission allow/deny tests and real coordinate rendering pass without broadening unrelated permissions.

### S1-06 — High — excluded sensitive/payment features remain active

Affected: registration Aadhaar/UPI fields, volunteer earnings/withdrawal, mock checkout/donation/sponsor flows, related schema/copy. Expected: excluded from MVP production path. Observed: raw Aadhaar/UPI collection, direct client earnings updates, and mock payment success behavior. Owner: Frontend removes production UI/path; Backend removes/restricts schema/API behavior. Acceptance: no MVP path collects these fields or represents mock payment/earnings as real; retained historical data handling is documented.

### S1-07 — Medium — no automated test harness

Affected: repository test configuration. Expected: frontend, backend, database authorization, concurrency, and integration gates. Observed: no test script. Owners: both within their scopes; shared manifest writer protocol applies. Acceptance: stage-specific suites run in CI/local with real exit evidence.

## Supabase discovery status

Antigravity has a Supabase MCP server URL scoped to project reference `xtbabyqkgirjiratjcap`. OAuth and accessible project identity are not verified, and no project was modified. A visible authentication flow requires human completion; computer automation must not complete authentication.

## Antigravity control status

Antigravity is installed and running. Official documentation verifies `/teamwork-preview <task>` and its Phase 1 scoping/approval behavior. Automated input to the active Antigravity window was rejected because user input was detected, so Codex did not send prompts or claim execution. Relay prompts are published under `docs/orchestration/prompts/`.

## Stage result

`BLOCKED`: Codex baseline/documents/contracts are complete, but Stage 1 exit requires actual frontend/backend handoffs, verified Supabase project status, and the OTP integration dependency.
