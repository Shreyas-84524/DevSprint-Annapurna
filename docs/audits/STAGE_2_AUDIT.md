# Stage 2 Audit

Initial audit: 2026-10-29 (Asia/Calcutta)

Correction re-audit: 2026-11-04 (Asia/Calcutta)

Result: **FAIL — second correction and re-audit required**

Audited correction commits:

- `ab3375e` — reproducible migrations, RLS helpers, and database procedures
- `84b5be0` — durable OTP claim, proof ID, and Next.js proxy migration
- `5661dff` — transactional onboarding and one-time admin bootstrap claim

## Reproduced checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass, exit 0 |
| `npm run lint` | Pass, exit 0 with 29 warnings |
| `npm test` | Pass, 56 tests across 20 suites |
| `npm run build` | Pass with network access, 37 pages generated, Proxy recognized |
| `git diff --check a6fd0ca..HEAD` | Pass |
| Clean Supabase migration replay | Not demonstrated in this Codex environment |
| Database RLS tests | Absent. No `supabase/tests` suite exists |
| Supabase security advisor | Worker reported zero lints, but no project-bound output or migration state was supplied for independent correlation |
| Live Swift SMS | Not run, correctly requiring explicit user authorization |

The test command initially failed inside the restricted sandbox because Node could not query Windows user information. It passed outside that restriction. The production build initially failed only because Google Fonts were unreachable, then passed with network access.

## Original finding disposition

| Finding | Re-audit disposition |
|---|---|
| S2-01 durable OTP state | **Open**. Production code can silently select an in-memory fallback, and database transitions are separate non-atomic writes |
| S2-02 authoritative verification persistence | **Open**. The proof ID is corrected, but attempt consumption, proof persistence, and profile verification are not atomic |
| S2-03 route enforcement | **Partially corrected**. `proxy.ts` and role checks exist, but missing Supabase configuration allows protected requests through and the negative test does not prove the unverified-user redirect |
| S2-04 reproducible migrations | **Structurally improved but unverified**. The table/view collision was removed, but no clean reset evidence was supplied or reproducible here |
| S2-05 recursive RLS | **Structurally corrected but unverified**. The helper removes the direct policy recursion, but no real database allow/deny tests exist |
| S2-06 admin bootstrap | **Open**. Success and one-time lockout are not tested, the route falls back to a non-privileged client, and concurrent first calls can create multiple admins |
| S2-07 environment contract | **Open**. The browser client still uses placeholder credentials, Proxy fails open, and the service-role key is operationally required by current verification code despite being described as optional |
| S2-08 transactional onboarding | **Open**. The application calls a public RPC name for a function created in the non-exposed `internal` schema, then falls back to partial client writes whose rollback cannot delete the profile under current RLS |

## Blocking re-audit findings

### S2-R1-01 — Critical: verification still falls back to process memory

Owner: Antigravity Backend

Evidence:

- `src/server/verification.ts:205-215` catches both privileged and request-scoped client setup failures and returns `fallbackTestDb`.
- `fallbackTestDb`, `recordsCache`, and `attemptsCache` are module-level state in production-imported code.
- The passing integration test does not inject a durable client. It resets and exercises these maps, so its “separate serverless invocations” are calls in one Node process.

Expected behavior: production verification must fail closed when its durable store is unavailable. Test-only fakes must be explicitly injected and must never be selected through production configuration failure.

Acceptance criteria:

1. Remove automatic in-memory fallback from production resolution.
2. Require the server-only privileged database boundary needed for verification mutations.
3. Prove send and verify across genuinely separate application invocations or against one shared test database.

### S2-R1-02 — Critical: OTP state transitions remain race-prone and non-atomic

Owner: Antigravity Backend

Evidence:

- `src/server/verification.ts:233-340` checks idempotency, cooldown, and rate limits, calls Swift, expires older rows, and inserts the challenge through separate queries.
- `src/server/verification.ts:383-530` reads a pending row, calls Swift, marks it consumed, upserts evidence, and updates the profile through separate queries.
- The committed atomic procedures under `internal` are never called by the verification service.
- Consume updates do not condition on the row still being pending. Concurrent requests can both act on the same challenge.

Expected behavior: database-enforced concurrency control must make challenge creation, failure counting, replay prevention, evidence persistence, and profile verification consistent and retry-safe.

Acceptance criteria:

1. Use reviewed database procedures or equivalent conditional writes with locks and affected-row checks.
2. Make successful consumption, evidence upsert, and profile verification one database transaction.
3. Add concurrency tests for duplicate send, duplicate verify, retry counters, and replay.

### S2-R1-03 — Critical: onboarding's transaction is unreachable and fallback can leave partial state

Owner: Antigravity Backend

Evidence:

- The migration creates `internal.complete_onboarding_tx` while `src/server/onboarding.ts:132-145` calls `supabase.rpc('complete_onboarding_tx', ...)` through the client's default exposed schema.
- On RPC failure, `src/server/onboarding.ts:179-274` performs separate client-scoped inserts.
- Failure cleanup attempts to delete `profiles`, but no profile delete policy exists. Cleanup errors are ignored.

Expected behavior: onboarding must use one callable, authorized database transaction and return failure without persisting partial profile, location, or volunteer preference state.

Acceptance criteria:

1. Expose only the minimum safe callable boundary or invoke the private procedure through a server-controlled database mechanism.
2. Remove the non-atomic fallback.
3. Prove rollback with a real database failure injected after profile creation and after location creation.

### S2-R1-04 — High: test assertions permit the failures they claim to prevent

Owner: Antigravity Backend

Evidence:

- `tests/integration-audit.test.ts` labels the admin case as one-time rejection but accepts status `400`, `404`, `409`, or `500`. The reproduced run logged missing Supabase configuration and returned `500`, yet passed.
- The unverified-donor test supplies no valid authenticated Supabase session and asserts only status `307`. It can pass by redirecting an unauthenticated request to `/login` instead of an unverified donor to `/onboarding`.
- OTP durability tests exercise the module-level in-memory fallback.

Expected behavior: each exit-gate test must assert the exact success or denial state against the real boundary it names.

Acceptance criteria:

1. Prove first admin bootstrap returns success and the second returns `409`.
2. Prove a valid unverified donor and requester session redirects to `/onboarding`.
3. Replace permissive status sets and process-local durability claims with exact database-backed assertions.

### S2-R1-05 — High: environment failures allow insecure or misleading behavior

Owner: Antigravity Backend for runtime configuration and server clients. Antigravity Frontend owns the browser client correction if it is assigned separately.

Evidence:

- `src/proxy.ts:8-15` returns `NextResponse.next()` when Supabase variables are missing, including for protected routes.
- `src/lib/supabase.ts` still creates a browser client with placeholder URL and key values.
- Verification mutations require a service-role client because authenticated table writes were revoked. Falling back to the request-scoped client cannot perform the required mutations.

Expected behavior: protected routes and authoritative server operations fail closed. Environment documentation must distinguish required runtime variables from optional operational variables.

Acceptance criteria:

1. Deny or safely redirect protected routes when authentication configuration is unavailable.
2. Remove production placeholder credentials from the browser initializer.
3. Document the actual required server-only database credential and verify its absence produces a controlled failure.

### S2-R1-06 — High: admin bootstrap is not proven one-time under real or concurrent execution

Owner: Antigravity Backend

Evidence:

- No test proves a successful first bootstrap.
- `src/app/api/admin/bootstrap/route.ts:90-96` falls back from the service-role client to a request-scoped client.
- The application pre-check and SQL function both use an existence check without serializing concurrent first calls. Two different target users can pass before either insert commits.
- On RPC failure the route attempts a direct upsert, which is a second behavior path rather than failing closed.

Expected behavior: bootstrap must use one privileged, concurrency-safe, one-time database operation and must be disabled or reliably reject every later call.

Acceptance criteria:

1. Require the privileged server client and remove the request-scoped/direct-upsert fallback.
2. Serialize first-admin creation with an appropriate database constraint or lock.
3. Test first success, repeat rejection, concurrent calls, invalid user, and missing privileged configuration.

### S2-R1-07 — High: database security evidence is incomplete

Owner: Antigravity Backend

Evidence:

- No `supabase/tests` directory or pgTAP allow/deny suite is committed.
- Security-definer functions use `SET search_path = public, pg_temp` rather than an empty pinned search path with fully qualified names.
- The worker's zero-lint advisor claim is not accompanied by the applied migration list or project-bound output needed to show that these exact migrations were inspected.

Expected behavior: the committed migration history must replay into a test database, database authorization must be exercised directly, and advisor evidence must correspond to the resulting schema.

Acceptance criteria:

1. Run and report a clean migration reset from the committed history.
2. Commit database tests for anon, owner, another user, admin, and service operations across the Stage 2 tables and functions.
3. Pin every security-definer search path safely and apply least-privilege function execution grants.
4. Supply migration-list and advisor evidence tied to the intended Annapurna project without secrets.

## Scope observations

- Commit `de947a8` still contains Stage 4 Geoapify routing work. It was not expanded during these corrections and remains reserved for its Stage 4 audit.
- The shared checkout contains unrelated modified and untracked files. This audit examined the correction commits and did not adopt or overwrite those user changes.
- The current Supabase breaking-change schedule makes explicit Data API grants material. Migration and database tests must verify that required tables and RPC boundaries remain exposed only as intended.

## Exit decision

Stage 2 remains unaccepted. Stage 3 implementation must stay paused until all S2-R1 findings are corrected and Codex re-audits the resulting commits.

The controlled live SMS test remains a separate manual gate and may run only after explicit user authorization.
