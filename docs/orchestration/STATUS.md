# Project Status

Updated: 2026-11-04 (Asia/Calcutta)

## Overall

Current stage: Stage 2
Stage status: `BLOCKED` at isolated database replay and pgTAP execution
Recorded correction base: `5661dff`
Integration branch: `codex/integration-stage2-fix`
Integration implementation head: `5928193`
Shared checkout: dirty and preserved; not used for implementation

## Separate status fields

| Area | Status | Evidence |
|---|---|---|
| Implementation | Stage 2 correction set complete on the integration branch | `23954f1`, `2e41cbd`, `5928193` |
| Codex verification | Application checks pass; fresh database replay and pgTAP execution blocked | `docs/audits/STAGE_2_REAUDIT.md` |
| User manual verification | Live Swift SMS/device check not run | Requires explicit authorization and a user-owned number |
| Deployment | Not started | Stage 6 concern; production database was not mutated during this audit |

## Baseline checks

| Check | Result |
|---|---|
| `git diff --check 5661dff..5928193` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass; 29 pre-existing warnings, 0 errors |
| `npm run build` | Pass; 37 routes and Proxy recognized |
| `npm test` | Pass; 60 tests across 21 suites |
| Fresh Supabase migration replay | Blocked; Docker and Podman are unavailable |
| `supabase test db` | Blocked by the same local-runtime dependency |

## Human action required: yes

Authorize one isolated database-validation path: install/start Docker or Podman for local Supabase, or create a disposable Supabase preview branch. The production project must not receive this unverified migration.

## API/service/environment changes

Stage 2 now requires `SUPABASE_SERVICE_ROLE_KEY` for OTP persistence, onboarding transactions, and admin bootstrap. Browser and protected-route initialization fail closed when required public Supabase values are missing. The intended project `xtbabyqkgirjiratjcap` was confirmed healthy through a read-only query. No remote schema mutation was performed.

## Manual verification needed

- Run a clean migration replay and `supabase test db` in an isolated database.
- Re-run Supabase security/performance advisors against that resulting schema.
- Complete a controlled Swift send/verify/wrong-code/replay test only with explicit authorization.
- Keep Stage 3 paused until the database gate passes and this status is changed to `PASSED`.
