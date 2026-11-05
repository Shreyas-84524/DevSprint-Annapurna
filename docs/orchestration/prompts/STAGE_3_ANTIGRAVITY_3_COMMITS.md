# Antigravity — Stage 3 Three-Commit Execution Prompt

Invoke in a new Antigravity conversation with:

`/teamwork-preview <paste the complete task below>`

Approve the generated Teamwork artifact, then begin execution immediately.

## Complete task

You are responsible for completing Project Annapurna Stage 3: food listings, requester claims, and volunteer assignment. This is a hackathon delivery. Stage 3 development is explicitly authorized to begin from exact base commit `33a0b6e9e7d7aa9e81849158765b97d260a66782` while the reduced-assurance Stage 2 hosted-database verification remains separately documented. Do not wait for Docker and do not claim production readiness.

Read `AGENTS.md` first. Read the relevant Next.js 16.2.4 guides in `node_modules/next/dist/docs/` before changing application code. Before any Supabase work, read `.agents/skills/supabase/SKILL.md` and `.agents/skills/supabase-postgres-best-practices/SKILL.md` completely, check the current official Supabase changelog/docs, and follow their migration, RLS, privilege, function-security, and testing guidance. Read `docs/product/MVP.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/DATA_MODEL.md`, `docs/architecture/FILE_STRUCTURE.md`, and `docs/orchestration/STAGES.md`.

## Branch and worktree protocol

The shared checkout and `main` are dirty and must remain untouched. Do not switch their branch, clean them, reset them, stash them, or copy implementation files into them.

Use separate clean worktrees/checkouts:

1. Backend worktree on `antigravity/stage-3-backend`, created from exact base `33a0b6e9e7d7aa9e81849158765b97d260a66782`.
2. After the two backend commits are complete, create a separate frontend worktree and branch `antigravity/stage-3` at the second backend commit. The final frontend branch therefore contains all three commits in order.

Never let frontend and backend workers edit the same checkout. Backend owns `src/app/api`, `src/server`, Supabase files, shared/generated types, package/lock files, and runtime configuration. Frontend owns pages/layouts, UI components/styles, browser hooks/clients, contexts, and frontend tests. Codex owns `docs/`; do not edit planning, audit, status, or prompt files.

Push only the final three-commit branch to `origin/antigravity/stage-3`. Do not push to `main`, `codex/integration-stage2-fix`, or any Stage 2 branch. Do not force-push. If a commit needs correction before handoff, amend it in its owning worktree so the final branch still contains exactly three Stage 3 commits.

## Required commit plan — exactly three commits

### Commit 1

Exact commit subject:

`feat(stage3-db): add listings claims delivery foundation`

Backend-owned scope only:

- Add one forward Stage 3 migration created through the current Supabase CLI workflow; never edit an already-applied migration.
- Model donor-owned food listings, private pickup data, image metadata/storage authorization, whole-listing claims, deliveries, expiry, timestamps, and row versions.
- Enforce database invariants: at most one active claim per listing, one assigned volunteer per delivery, and one active delivery per volunteer.
- Use canonical roles `donor`, `requester`, `volunteer`, and `admin`.
- Keep exact pickup/requester coordinates private; public discovery exposes only safe summaries.
- Enable RLS on every exposed table, use explicit Data API grants, least-privilege function execution, safe search paths, and storage policies validating owner/path/MIME/size.
- Update backend-owned shared contract and generated database types required by the approved Stage 3 API contracts.
- Add structural, grant, RLS role-matrix, storage, expiry, and constraint pgTAP tests.

Before Commit 1: review the migration and run every database check available without Docker. Hosted Supabase project `xtbabyqkgirjiratjcap` is a hackathon development dependency, but do not reset it, drop schemas, expose secrets, or apply unreviewed SQL. If permanent hosted mutation is necessary, report the exact dry run and migration plan before executing it.

### Commit 2

Exact commit subject:

`feat(stage3-api): add atomic claim and volunteer assignment`

Backend-owned scope only:

- Implement the approved endpoints:
  - `POST /api/listings`
  - `PATCH /api/listings/:id`
  - `POST /api/listings/:id/publish`
  - `GET /api/listings/nearby`
  - `POST /api/listings/:id/claim`
  - `GET /api/volunteer/tasks/available`
  - `POST /api/deliveries/:id/accept`
  - `GET /api/deliveries/:id`
- Enforce authentication, role, verification, ownership, current state, row version, expiry, idempotency, and private-field projection at server and database boundaries.
- Make claim and volunteer acceptance atomic and retry-safe. Concurrent requests must produce one winner; losers receive exact `409` conflicts or `410` expiry results. Repeating the same idempotency key returns the original logical result.
- Add exact route/service/database tests for success, authorization, validation, privacy, retry, expiry, duplicate claims, competing volunteers, and one-active-delivery behavior.
- Do not implement Stage 4 QC, tracking, routing, collection, handover, confirmation, or cancellation recovery.

Commit 2 only after backend TypeScript, tests, lint, build, database tests available in the environment, and `git diff --check` pass. Never make permissive assertions that accept unrelated status codes.

### Commit 3

Exact commit subject:

`feat(stage3-ui): connect listing claim and assignment workflows`

Frontend-owned scope in the separate frontend worktree:

- Connect donor create/edit/image/publish flows to the approved API and canonical server state.
- Connect requester nearby discovery and whole-listing claim without exposing private pickup data before authorization.
- Connect volunteer available tasks and atomic acceptance, including the one-active-delivery state.
- Update role dashboards/navigation for donor, requester, and volunteer. Preserve `beneficiary` only where compatibility requires it; new terminology uses `requester`.
- Render complete loading, empty, validation, upload, unauthorized, verification-required, session-expired, stale-version, conflict, expired, unavailable, offline/retry, and reconnect-refresh states.
- Remove or isolate production-path Stage 3 mocks and direct multi-table Supabase workflow writes.
- Add frontend tests for successful role journeys and every important negative state. Re-fetch canonical server state after mutations rather than assuming an optimistic write won.
- Do not edit backend-owned files or implement Stage 4/5 functionality.

Commit 3 only after TypeScript, tests, lint, production build, and `git diff --check` pass on the final three-commit branch.

## Stage 3 exit verification

Before pushing, verify the final branch contains exactly these three new commits after base `33a0b6e9e7d7aa9e81849158765b97d260a66782`, in the specified order. The worktree must be clean. Push:

`git push -u origin antigravity/stage-3`

Do not begin Stage 4 or Stage 5 in this task.

## HUMAN ACTION REQUIRED protocol

Pause only work that genuinely needs a credential, account action, hosted database mutation approval, or product decision. State the exact blocked task, smallest user action, secure secret location, independent work that continues, and verification afterward. Never request or print secret values. Do not use another Supabase project, bypass authorization, weaken tests, or label mocked behavior as integrated.

## Required final handoff

Return:

- Stage/task IDs completed.
- Base commit and the three exact resulting commit hashes/subjects.
- Backend and frontend branches/worktrees used.
- Final pushed branch and remote tracking result.
- Files changed grouped by owner and commit.
- Migration, RLS, storage, function, API, contract, and environment-name changes.
- Exact commands and results for tests, TypeScript, lint, build, diff check, database tests, migration dry run/application, and advisors.
- Concurrency and private-data test evidence.
- Known issues and `HUMAN ACTION REQUIRED` status.
- Manual verification checklist.
- `Ready for Codex audit: yes/no`.

Separate implementation, Codex verification, user manual verification, deployment, and production readiness. Do not claim Stage 3 passed; Codex performs the integration audit after handoff.
