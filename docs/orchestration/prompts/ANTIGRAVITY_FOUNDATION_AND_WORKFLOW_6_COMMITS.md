# Antigravity — Foundation and Core Workflow Execution Prompt

Invoke in a new Antigravity conversation with:

`/teamwork-preview <paste the complete task below>`

Approve the generated Teamwork artifact, then execute the complete task immediately.

## Complete task

Complete Project Annapurna's identity/onboarding foundation first, record that completion as exactly three commits, then implement the food-listing, requester-claim, and volunteer-assignment workflow and record that work as exactly three additional commits. The final branch must contain exactly six new commits after the specified base, in the required order. Do not include phase numbers, stage numbers, milestone numbers, or phrases such as “phase completion” in branch names, commit subjects, code comments, documentation, test names, reports, or the final handoff.

Use exact base commit `5661dff941b56ecb74061a9d20f09feaccf93938`. Commit `33a0b6e9e7d7aa9e81849158765b97d260a66782` is the reviewed correction reference for the identity/onboarding foundation. Compare it with the base and reproduce its intended application behavior under the ownership and commit boundaries below; do not merge its existing commit history into the final branch.

Read `AGENTS.md` first. Read the relevant Next.js 16.2.4 guides in `node_modules/next/dist/docs/` before changing application code. Before any Supabase work, read `.agents/skills/supabase/SKILL.md` and `.agents/skills/supabase-postgres-best-practices/SKILL.md` completely, verify current official Supabase documentation/changelog, and follow the migration, RLS, privilege, function-security, storage, concurrency, and testing guidance. Read `docs/product/MVP.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/DATA_MODEL.md`, and `docs/architecture/FILE_STRUCTURE.md` for requirements, but do not edit Codex-owned `docs/` files.

## Isolation and ownership

The shared checkout and `main` are dirty. Do not switch, clean, reset, stash, or implement in that checkout. Use separate clean worktrees and never let frontend and backend workers edit the same checkout.

- Backend owns `src/app/api`, `src/server`, server authz/services, Supabase migrations/RLS/functions/storage/tests, shared/generated types, package/lock files, and runtime configuration.
- Frontend owns pages/layouts, UI components/styles, browser hooks/clients, contexts, and frontend tests.
- Codex owns `docs/`, contracts approval, status, prompts, and integration audits.

Use this sequential branch/worktree chain:

1. Backend foundation worktree: `antigravity/foundation-backend`, starting at the exact base; create commits 1 and 2.
2. Frontend foundation worktree: `antigravity/foundation-ui`, starting at commit 2; create commit 3.
3. Backend workflow worktree: `antigravity/core-workflow-backend`, starting at commit 3; create commits 4 and 5.
4. Frontend final worktree: `antigravity/hackathon-core-workflow`, starting at commit 5; create commit 6.

Push only the final branch `antigravity/hackathon-core-workflow`. Do not push to `main`, any `codex/*` branch, or an earlier worker branch. Do not force-push. If a commit needs correction before handoff, amend it in its owning worktree so the final branch still contains exactly six new commits.

## First three commits — finish the existing foundation before continuing

### Commit 1

Exact subject:

`fix(db): finalize atomic identity and onboarding foundation`

Backend database scope:

- Reconcile the hosted migration version with the repository using a forward-safe migration history; never edit a migration already recorded remotely.
- Finalize canonical profiles, saved locations, volunteer preferences, durable verification attempts/evidence, and the security-invoker compatibility view.
- Enforce atomic onboarding; donor/requester verification; volunteer onboarding; OTP reservation/finalization/failure/consumption; replay protection; cooldown/rate limits; and one-time serialized admin bootstrap.
- Enforce one active OTP reservation/challenge per user with a database constraint plus transaction-level locking.
- Remove legacy race-prone RPCs and every production in-memory verification fallback.
- Prevent direct partial profile creation, role escalation, and self-verification.
- Apply explicit Data API grants, RLS role matrices, safe function search paths, least-privilege execution, and non-elevated trigger functions.
- Align generated database types and `supabase/config.toml` with current hosted behavior.
- Add pgTAP coverage for anon, owner, another user, admin, service role, grants, RLS, atomic onboarding, OTP reservation/replay, privileged functions, and admin bootstrap.

Do not permanently mutate the hosted database until the exact migration dry run and target project reference have been verified. Never reset or drop the hosted project.

### Commit 2

Exact subject:

`fix(auth): enforce durable verification and privileged boundaries`

Backend application scope:

- Make onboarding use only the atomic server-controlled database boundary; remove partial client-write and rollback fallbacks.
- Make verification require the durable privileged RPC boundary. Test fakes must be explicitly injected and unreachable through production configuration failure.
- Reserve before calling the SMS provider, cancel failed reservations, finalize accepted sends, record wrong codes transactionally, and consume successful verification exactly once.
- Require the privileged server client for admin bootstrap and authoritative workflow writes; remove request-client/direct-upsert fallbacks.
- Fail protected routes closed when auth configuration is missing and route authenticated unverified donor/requester users to onboarding.
- Update environment documentation/types owned by backend without exposing secrets.
- Add exact route/service tests for controlled configuration failure, first/repeat/concurrent admin bootstrap, onboarding rollback, OTP cooldown/rate limit/wrong code/replay/cross-user behavior, and protected-route authorization. Do not accept broad sets of unrelated status codes.

### Commit 3

Exact subject:

`fix(ui): finalize role onboarding and fail-closed clients`

Frontend scope in the separate frontend worktree:

- Finalize role-aware onboarding for donor, requester, and volunteer using canonical roles.
- Donor/requester flows require the external OTP proof path; volunteer onboarding does not add extra OTP or approval gates.
- Require a saved location and provide permission-denied/manual-location, loading, retry, validation, session-expired, success, and failure states.
- Make the browser Supabase client fail closed for missing or placeholder public configuration.
- Ensure dashboard routing and UI states match canonical role and verification state.
- Add frontend tests for missing configuration, each role path, verification-required behavior, location fallback, and routing outcomes.

After commit 3, stop and verify the accumulated foundation before beginning listing work. Required checks: TypeScript, full application tests, lint, production build, `git diff --check`, migration ledger/dry run, database lint, pgTAP where safely available, and security/performance advisors where accessible. Record the exact results. Do not start the next work block if a critical authorization, atomicity, or migration defect remains.

## Next three commits — implement the core food workflow

### Commit 4

Exact subject:

`feat(db): add listings claims and delivery foundation`

Backend database scope:

- Create a new forward migration for donor-owned food listings, private pickup data, prepared image metadata/storage authorization, whole-listing claims, and deliveries.
- Model explicit listing/delivery states, expiry, row versions, timestamps, ownership, and idempotency records.
- Enforce at most one active claim per listing, one assigned volunteer per delivery, and one active delivery per volunteer using database constraints and transaction-safe mechanisms.
- Keep exact pickup/requester locations private. Nearby discovery exposes only safe summaries until the caller is an authorized workflow participant.
- Enable RLS on every exposed table, add explicit least-privilege grants, secure storage paths/MIME/size/ownership, and restrict privileged function execution.
- Update backend-owned shared contracts and generated database types.
- Add structural, grant, RLS role-matrix, storage, expiry, privacy, idempotency, and constraint tests.

### Commit 5

Exact subject:

`feat(api): add atomic claim and volunteer assignment`

Backend application scope:

- Implement:
  - `POST /api/listings`
  - `PATCH /api/listings/:id`
  - `POST /api/listings/:id/publish`
  - `GET /api/listings/nearby`
  - `POST /api/listings/:id/claim`
  - `GET /api/volunteer/tasks/available`
  - `POST /api/deliveries/:id/accept`
  - `GET /api/deliveries/:id`
- Enforce authentication, canonical role, verification, ownership, current state, row version, expiry, idempotency, and private-field projection at server and database boundaries.
- Make claim and volunteer acceptance atomic and retry-safe. Concurrent eligible requests produce exactly one winner; losers receive exact `409` conflict or `410` expiry results. Same-key retries return the original logical result.
- Add exact route/service/database tests for success, authorization, validation, privacy, duplicate retry, expiry race, competing claims, competing volunteer acceptance, and one-active-delivery enforcement.
- Do not implement QC, live tracking, routing, collection, handover, receipt confirmation, or cancellation recovery.

### Commit 6

Exact subject:

`feat(ui): connect listing claim and assignment workflows`

Frontend scope in the separate final worktree:

- Connect donor create/edit/image/publish flows to the approved APIs and canonical server state.
- Connect requester nearby discovery and whole-listing claim without exposing private pickup data before authorization.
- Connect volunteer available tasks and atomic acceptance, including the one-active-delivery restriction.
- Update role dashboards/navigation. Preserve `beneficiary` only for compatibility; new UI copy and contracts use `requester`.
- Render loading, empty, validation, upload, unauthorized, verification-required, session-expired, stale-version, conflict, expired, unavailable, offline/retry, and reconnect-refresh states.
- Remove or isolate production-path listing/claim/assignment mocks and direct multi-table workflow writes.
- Add frontend tests for successful role journeys and all important negative states. Re-fetch canonical state after mutations instead of assuming optimistic state won.
- Do not implement QC, maps/routes, GPS tracking, collection, handover, receipt confirmation, cancellation recovery, payments, wallets, Aadhaar, NGO management, volunteer approval, or partial claims.

## Final verification and push

Before pushing, run against the final six-commit branch:

- `npx tsc --noEmit`
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check 5661dff941b56ecb74061a9d20f09feaccf93938..HEAD`
- all safely available migration, pgTAP, RLS, concurrency, lint, and advisor checks

Verify the worktree is clean and that exactly six commits exist after the base in the specified order. Push:

`git push -u origin antigravity/hackathon-core-workflow`

Do not begin QC, mapping, tracking, completion, supporting-feature hardening, or deployment work in this task.

## HUMAN ACTION REQUIRED protocol

Pause only work that genuinely requires a credential, account action, permanent hosted-database mutation approval, or product decision. State the exact blocked work, smallest user action, safe secret location, independent work continuing, and verification afterward. Never request or print secret values. Do not use another project, weaken tests, bypass authorization, or label mocks as integrations.

## Required final handoff

Return:

- Exact base and all six commit hashes/subjects in order.
- Branches/worktrees used and ownership boundaries followed.
- Final pushed branch and remote tracking result.
- Files changed grouped by commit and owner.
- Database, RLS, storage, function, API, contract, and environment-name changes.
- Exact results for tests, typecheck, lint, build, diff check, migrations, database tests, concurrency tests, and advisors.
- Private-data and authorization evidence.
- Known issues and `HUMAN ACTION REQUIRED` status.
- Manual verification checklist.
- `Ready for Codex audit: yes/no`.

Separate implementation, Codex verification, manual verification, deployment, and production readiness. Do not claim overall completion; Codex performs the integration audit after handoff.
