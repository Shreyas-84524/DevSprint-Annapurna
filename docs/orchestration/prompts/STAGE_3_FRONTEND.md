# Antigravity Frontend — Stage 3 Prompt

Prepare this prompt now, but do not execute it until Codex changes Stage 2 to `PASSED` and supplies the exact Stage 3 base commit.

Invoke in a new Antigravity conversation rooted at a dedicated frontend worktree using:

`/teamwork-preview <paste the complete task below>`

Review and approve the generated prompt artifact before execution.

## Complete task

You are the Antigravity Frontend owner for Project Annapurna Stage 3: listings, claims, and volunteer assignment. Do not begin if `docs/orchestration/STATUS.md` does not mark Stage 2 `PASSED`, or if the user/Codex has not supplied an exact Stage 3 base commit. In that case, report `HUMAN ACTION REQUIRED — STAGE 2 GATE` and stop dependent work.

Work only in a dedicated clean worktree/clone on branch `antigravity/frontend-stage-3`, based on the exact commit supplied by Codex. Never switch branches or implement in the shared checkout. Do not edit `src/app/api`, server services/authz, Supabase migrations/RLS/functions/storage, shared contract/generated database types, package/lock files, or runtime configuration. Request backend/contract changes through the handoff instead of crossing ownership boundaries.

Read `AGENTS.md`; the relevant installed Next.js guides in `node_modules/next/dist/docs/`; and the authoritative files under `docs/product`, `docs/architecture`, and `docs/orchestration`. Inspect the integrated Stage 2 UI and the approved Stage 3 contract types before implementation. Do not invent API behavior.

Task IDs: `S3-FE-01` through `S3-FE-08`.

1. Connect the donor listing flow to the approved API: create/edit a food listing, choose an existing saved pickup location, provide food metadata and expiry, optionally prepare/upload one image through the approved flow, publish, and show the canonical server state.
2. Implement donor listing states for initial load, validation, upload progress/failure, save/publish progress, success, empty data, unauthorized role, session expiry, stale version, already claimed, expired, and retryable dependency failure.
3. Connect requester nearby discovery and whole-listing claim. Use safe summary data only; never reveal exact pickup details before authorization. Support loading, empty radius, pagination/cursor if supplied, expired/unavailable, already claimed, conflict, location-required, verification-required, offline/retry, and session-expiry states.
4. Connect the volunteer available-task list and atomic task acceptance. Render one clear winner/loser result for concurrent acceptance, respect the one-active-delivery rule, and refresh canonical delivery state after success, conflict, retry, or reconnect.
5. Update role dashboards and navigation so donor, requester, and volunteer users can reach only their Stage 3 workflows. Preserve `beneficiary` only where compatibility requires it; new UI copy and contracts use `requester`.
6. Use browser-safe API clients and approved shared DTOs. Do not perform direct multi-table Supabase workflow writes, infer trusted role/owner/verification fields, expose private coordinates, or put privileged credentials in browser code.
7. Remove or isolate production-path listing/claim/assignment mocks and dead actions replaced by the real APIs. Preserve unrelated useful UI and avoid repository-wide redesign or refactoring.
8. Add frontend tests for each role's successful Stage 3 path and the important negative states: unauthorized role, unverified donor/requester, invalid/expired listing, stale edit, claim conflict, acceptance conflict, active-delivery conflict, upload failure, session expiry, empty state, and retry/reconnect refresh. Run TypeScript, lint, frontend/application tests, production build, and diff checks.

Do not implement Stage 4 maps/routes, foreground GPS tracking, QC, collection, dropoff, handover, receipt confirmation, or cancellation recovery. Do not add payments, wallets, Aadhaar, NGO management, volunteer approval, partial claims, or claims of background location reliability.

### Contract discipline

Consume only approved Stage 3 endpoints and DTOs. If a field or response is missing, record an exact contract proposal and continue only with independent UI work; do not fabricate backend responses or silently edit shared contracts. Re-fetch canonical server state after workflow mutations rather than assuming optimistic state won.

### HUMAN ACTION REQUIRED protocol

When an account action, credential, storage setting, environment update, device permission, external service, or product decision is required: interrupt only dependent work with `HUMAN ACTION REQUIRED`; name the blocked task; give the smallest concrete user action; explain secure secret placement without requesting secrets in chat or commits; list independent work that can continue; and state how the result will be verified.

### Required handoff

Report Stage/task IDs; exact base and resulting commit; branch/worktree; files changed; implemented user flows and states; API endpoints/DTOs consumed; contract proposals; environment changes (`none` unless a dependency is reported); commands and exact results; screenshots or concise UI evidence where useful; known issues; Human action required yes/no; manual verification checklist; and Ready for Codex audit yes/no. Separate implementation status, Codex verification, user manual verification, deployment, and production readiness. Do not claim Stage 3 passed; only Codex can audit the exit gate.
