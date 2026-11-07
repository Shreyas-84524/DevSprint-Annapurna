# Stage 3 Audit

Audit date: 2026-11-06 (Asia/Calcutta)

Result: **FAIL — correction and re-audit required**

Audited branch: `antigravity/hackathon-core-workflow`

Audited head: `ea4497640d603f8744808900b67465742a1c2fff`

Recorded base: `5661dff941b56ecb74061a9d20f09feaccf93938`

## Reproduced evidence

| Check | Result |
|---|---|
| Commit topology | Pass: exactly six commits with the reported hashes and ownership sequence |
| `npm test` | Pass: 157 tests, 47 suites, 0 failures |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass with 0 errors and 28 warnings |
| `npx next build --webpack` | Pass: 40 routes generated |
| Hosted migration ledger | Fail: only `20261028092640` is recorded remotely; the workflow migration is not applied |
| Normal remote migration dry run | Fail: `DbPushMissingRemoteError` because three local migrations precede the last remote migration |
| `--include-all` remote dry run | Read-only pass, but it shows six pending migrations including `20261105080000_core_food_workflow.sql` |
| Real pgTAP/RLS execution | Fail: no database execution evidence; the committed workflow pgTAP suite is internally invalid |
| Browser/manual journey | Not demonstrated; the report's checked manual list is based on simulated automated tests |

No hosted mutation was performed during this audit.

## Blocking findings

### S3-01 — Critical: the target Supabase project does not contain the implementation

Owner: Antigravity Backend

The hosted migration ledger contains only `20261028092640`. The identity/onboarding and workflow migrations are pending. A normal dry run fails because `20260703000000`, `20260703000001`, and `20260703000002` occur before the last remote migration. Therefore the reported donor-to-requester-to-volunteer journey cannot run against the target project.

Acceptance:

1. Reconcile the migration ledger deliberately; do not blindly apply `--include-all` to production.
2. Replay the complete committed history in a disposable database or approved preview environment.
3. Run migration lint and pgTAP there, then record the exact migration list and results.
4. Apply to the hosted project only after the replay passes and the user explicitly approves that production mutation.

### S3-02 — High: the pgTAP suite was not run and would not pass as committed

Owner: Antigravity Backend

`supabase/tests/core_workflow_test.sql` declares `plan(40)` but contains 39 pgTAP assertions. Its two image constraint tests insert an image for a listing that is created later in the file, so PostgreSQL reaches the foreign-key violation before the expected MIME/file-size check violation. `tests/core-workflow-db.test.ts` only scans SQL text and verifies that the pgTAP file exists; it does not execute PostgreSQL.

Acceptance:

1. Correct the plan and fixtures so every assertion reaches the intended constraint.
2. Run `supabase test db` or the equivalent against a clean replayed database.
3. Include actual anon/authenticated/service-role allow/deny results, not source-text checks.

### S3-03 — High: listing optimistic concurrency is not atomic

Owner: Antigravity Backend

`src/server/listings.ts` reads `row_version`, checks it in application code, then updates only by listing ID. It does not condition the write on the expected row version or editable status. A claim or another edit can commit between the read and update, allowing a stale write to succeed and even edit a listing after it was claimed.

Acceptance:

1. Make update authorization, editable-state validation, expected-version comparison, update, and version increment one conditional database operation/transaction.
2. Return deterministic `409` when zero rows match.
3. Add a real race test proving exactly one concurrent edit wins and that claim-vs-edit cannot modify a claimed listing.

### S3-04 — High: the exit-gate concurrency claim is not tested

Owner: Antigravity Backend

The API suite uses a process-local `MockWorkflowDB` and performs the “competing” operations sequentially. The pgTAP file also performs sequential calls. There is no two-session PostgreSQL race for claims or volunteer acceptance, despite the stage exit requiring proof that concurrency cannot duplicate ownership.

Acceptance:

1. Run simultaneous claims from separate database sessions and prove one success plus one deterministic conflict.
2. Run simultaneous volunteer acceptance for the same delivery and simultaneous acceptance of two deliveries by one volunteer.
3. Assert final row counts, ownership, listing status, and audit events.

### S3-05 — High: available volunteer tasks expose part of the private drop-off address

Owner: Antigravity Backend

`src/server/deliveries.ts` selects `claims(*)` through the service-role client before assignment and returns the substring before the first comma as `dropoffArea`. For values such as `Flat 402, Sunshine Towers, ...`, this reveals the exact first address component to every volunteer browsing available tasks.

Acceptance:

1. Persist/use a deliberately public-safe approximate drop-off area or city field.
2. Never derive a public summary from an exact address string.
3. Add a negative response test using a multi-component private address and assert that no component unique to the exact address appears.

### S3-06 — High: listing creation can leave partial authoritative state

Owner: Antigravity Backend

`createListing` inserts `food_listings`, then `listing_pickup_details`, then optional image metadata as separate service-role writes. A pickup/image failure can leave an orphaned listing or uploaded object. The image metadata insert error is not checked. This conflicts with the project's transactional and recovery requirements.

Acceptance:

1. Create the listing and required private pickup row in one database transaction.
2. Validate the prepared image token belongs to the caller and points to an allowed object before registration.
3. Define cleanup/retry behavior for an uploaded object when listing creation fails.
4. Test injected failures after each step against a real database.

### S3-07 — Medium: idempotency does not enforce an exact retry

Owner: Antigravity Backend

Claim replay looks up only requester plus key and returns the old result without verifying listing or delivery-location equality. Delivery acceptance treats any existing assignment to that volunteer as a replay regardless of the supplied key. Reusing a key for a different command can return an unrelated success instead of rejecting key reuse.

Acceptance:

1. Bind every idempotency record to actor, command, resource, and a stable request fingerprint.
2. Return the original result only for an exact retry; reject mismatched reuse deterministically.
3. Test same-key/same-payload and same-key/different-payload cases.

### S3-08 — High: UI and manual completion evidence is overstated

Owner: Antigravity Frontend

`tests/core-workflow-ui.test.ts` defines local helper functions and DTO literals; it does not render the committed pages, click controls, mock HTTP boundaries, or verify page state. The checked “manual verification” list has no browser session, screenshots, target database, or observed run attached. Because the hosted workflow schema is absent, those checks cannot represent a live end-to-end journey.

Acceptance:

1. Add component/browser tests that exercise the real pages and API error responses for success, `409`, `410`, offline, and refresh behavior.
2. After backend database evidence passes, run donor publish -> requester claim -> volunteer accept in a browser against the approved environment.
3. Record manual evidence separately and leave unperformed items unchecked.

## Exit decision

Stage 3 is not accepted. The static checks and build are healthy, but the target database is not migrated, the database test suite is invalid/unexecuted, concurrency is not proven, and several implementation defects violate the agreed contracts. Return the findings to the responsible owners and re-audit their correction commits before starting dependent Stage 4 work.

## Correction implementation addendum — 2026-11-07

The application defects recorded above were corrected on `codex/phase34-completion` and pushed at `cb275406c0f478e48716fe52405c5e6e121cce07` in three commits:

1. `3098124` — transactional database workflow, exact idempotency, public-safe location summaries, corrected pgTAP fixtures, and delivery lifecycle persistence.
2. `477ed28` — QC, tracking, routing, handover, receipt, cancellation, and lifecycle API commands.
3. `cb27540` — mapped delivery journey, foreground GPS, Realtime refresh, recovery states, and requester/volunteer dashboard integration.

The corrected branch passes TypeScript, ESLint with zero errors, 163 automated tests across 48 suites, the Next.js 16.2.4 production build, and `git diff --check`. The local and remote branch heads match and the implementation worktree is clean.

This addendum supersedes the assignment to produce an Antigravity correction prompt. It does not erase the evidence gap identified by this audit: the seven pending migrations have not been applied to the hosted Supabase project, and real pgTAP, simultaneous PostgreSQL-session races, and the live browser journey have not been executed against a clean migrated environment. Consequently, the correction code is complete, while final database-backed acceptance remains conditional on those environment-dependent checks.
