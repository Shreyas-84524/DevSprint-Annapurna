# Stage 2 Correction Re-audit

Re-audit date: 2026-11-04 (Asia/Calcutta)

Result: **IMPLEMENTATION CORRECTED — DATABASE EXECUTION GATE BLOCKED**

Integration branch: `codex/integration-stage2-fix`

Integration head at audit start: `5928193`

## Correction commits

- `23954f1` — atomic privileged workflows, exact boundary tests, and database test suite
- `2e41cbd` — browser Supabase configuration fails closed
- `5928193` — restrict trigger-function execution

## Re-audit disposition

| Finding | Disposition | Evidence |
|---|---|---|
| S2-R1-01 — production memory fallback | Corrected | Production verification requires the service-role RPC client; the in-memory store exists only as an explicitly injected test helper |
| S2-R1-02 — non-atomic OTP transitions | Corrected in code; execution pending | Reservation, finalization, cancellation, failure recording, and successful consumption are database procedures; successful consumption locks the attempt and persists evidence/profile state in one transaction |
| S2-R1-03 — unreachable onboarding transaction | Corrected in code; execution pending | `complete_onboarding_tx` is a service-role-only public RPC; application fallback writes were removed |
| S2-R1-04 — permissive tests | Corrected | Tests assert protected-route `503`, unverified-role onboarding redirects, first bootstrap `200`, repeat bootstrap `409`, and replay `409` |
| S2-R1-05 — fail-open environment behavior | Corrected | Protected routes return controlled `503`; browser configuration throws instead of using placeholders; privileged operations require the service-role credential |
| S2-R1-06 — unsafe admin bootstrap | Corrected in code; execution pending | One service-role RPC path, transaction advisory lock, no request-client/direct-upsert fallback, and exact first/repeat tests |
| S2-R1-07 — incomplete database evidence | Partially corrected; final gate blocked | pgTAP suite is committed, explicit grants are present, definer functions use empty search paths, and the intended remote project is identified; a fresh migration replay and pgTAP execution still require an isolated database |

## Reproduced application checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass; 29 pre-existing warnings, 0 errors |
| `npm test` | Pass; 60 tests across 21 suites |
| `npm run build` | Pass; 37 routes generated and Proxy recognized |
| `git diff --check 5661dff..HEAD` | Pass |
| Integration worktree | Clean before this audit record |

The production build used non-secret syntactically valid public Supabase test values. No production credential was printed or committed.

## Database gate

- Intended Supabase project `xtbabyqkgirjiratjcap` was found through a read-only CLI query and reported `ACTIVE_HEALTHY`.
- A read-only preview-branch query returned no branches.
- `npx supabase start` could not run because neither Docker nor Podman is installed on this machine.
- No migration was applied to the production project.
- Therefore `supabase db reset` and `supabase test db` have not executed against the correction migration.

## Exit decision

The reported Stage 2 application defects are corrected on the integration branch. Stage 2 remains **BLOCKED at the database execution gate**, not failed for an outstanding known code defect.

Do not begin Stage 3 until one of these isolated validation paths passes:

1. run the committed migration and pgTAP suite locally after Docker or Podman is available; or
2. create a disposable Supabase preview branch, apply the committed migration there, run the database tests and advisors, then remove the branch.

The live Swift SMS/device check remains a separate manual verification and requires explicit authorization before sending a message.
