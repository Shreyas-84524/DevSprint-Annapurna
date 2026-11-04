# Antigravity Backend — Stage 3 Prompt

Prepare this prompt now, but do not execute it until Codex changes Stage 2 to `PASSED` and supplies the exact Stage 3 base commit.

Invoke in a new Antigravity conversation rooted at a dedicated backend worktree using:

`/teamwork-preview <paste the complete task below>`

Review and approve the generated prompt artifact before execution.

## Complete task

You are the Antigravity Backend owner for Project Annapurna Stage 3: listings, claims, and volunteer assignment. Do not begin if `docs/orchestration/STATUS.md` does not mark Stage 2 `PASSED`, or if the user/Codex has not supplied an exact Stage 3 base commit. In that case, report `HUMAN ACTION REQUIRED — STAGE 2 GATE` and stop dependent work.

Work only in a dedicated clean worktree/clone on branch `antigravity/backend-stage-3`, based on the exact commit supplied by Codex. Never switch branches or implement in the shared checkout. Do not edit frontend-owned pages, layouts, components, styles, contexts, browser hooks, or browser API clients. Backend is the sole Stage 3 writer for `src/types/contracts.ts`, generated database types, package/lock files, and runtime configuration.

Read `AGENTS.md`; the relevant installed Next.js guides in `node_modules/next/dist/docs/`; `.agents/skills/supabase/SKILL.md`; and `.agents/skills/supabase-postgres-best-practices/SKILL.md`. Read the authoritative files under `docs/product`, `docs/architecture`, and `docs/orchestration`. Inspect the integrated Stage 2 implementation before designing migrations. Do not guess current framework or Supabase behavior.

Task IDs: `S3-BE-01` through `S3-BE-09`.

1. Create a reproducible Stage 3 migration for donor-owned food listings, private pickup details, prepared image metadata/storage authorization, whole-listing claims, and deliveries. Preserve canonical roles `donor`, `requester`, `volunteer`, and `admin`.
2. Model explicit listing and delivery states, expiry, row versions, timestamps, ownership, and invariants. Enforce at most one active claim per listing, one assigned volunteer per delivery, and one active delivery per volunteer with database constraints or equivalent transaction-safe mechanisms.
3. Keep exact pickup address/coordinates and requester delivery location private. Nearby discovery returns only public-safe summaries until the authenticated actor becomes an authorized workflow participant.
4. Implement the Stage 3 HTTP contracts from `docs/architecture/API_CONTRACTS.md`:
   - `POST /api/listings`
   - `PATCH /api/listings/:id`
   - `POST /api/listings/:id/publish`
   - `GET /api/listings/nearby`
   - `POST /api/listings/:id/claim`
   - `GET /api/volunteer/tasks/available`
   - `POST /api/deliveries/:id/accept`
   - `GET /api/deliveries/:id`
5. Enforce authentication, role, ownership, verification, expiry, current state, row version, and idempotency at the server and database boundaries. Clients must never supply trusted owner, claimant, assignee, verification, or transition fields.
6. Make claim and volunteer acceptance atomic and retry-safe. Concurrent eligible requests must produce one winner and exact `409` conflict or `410` expiry outcomes for losers; retries with the same idempotency key return the original logical result.
7. Implement prepared image upload authorization with least privilege. Validate MIME type, size, ownership, and storage path. Do not expose service-role credentials or accept arbitrary public object paths. If the final upload flow requires a contract refinement, propose it explicitly before the frontend relies on it.
8. Commit direct database tests for anon, donor owner, another donor, requester, volunteer, admin, and service-role behavior. Include real concurrency tests for competing claims, competing volunteer acceptance, duplicate retries, expiry races, and one-active-delivery enforcement.
9. Add exact backend and route tests for success plus `400`, `401`, `403`, `404`, `409`, and `410` paths as applicable. Run a clean migration replay, pgTAP/database tests, TypeScript, lint, application tests, production build, and diff checks.

Do not implement Stage 4 QC, GPS tracking, route calculation, handover, or receipt confirmation. It is acceptable to create the minimum delivery state needed to represent an accepted Stage 3 task, but do not build later transitions. Do not add payments, wallets, Aadhaar, NGO management, volunteer approval, partial claims, or replacement OTP behavior.

### Contract discipline

Use the existing response envelope and status taxonomy. Do not silently change a documented endpoint or DTO. Record each necessary contract proposal with the exact request/response and reason; wait for Codex approval before making the frontend depend on it. Backend alone edits shared contract/generated database type files in Stage 3.

### HUMAN ACTION REQUIRED protocol

When an account action, credential, storage setting, Supabase project action, environment update, billing/quota decision, or product decision is required: interrupt only dependent work with `HUMAN ACTION REQUIRED`; name the blocked task; give the smallest concrete user action; explain secure secret placement without requesting secrets in chat or commits; list independent work that can continue; and state how the result will be verified. Never apply an unverified migration directly to production.

### Required handoff

Report Stage/task IDs; exact base and resulting commit; branch/worktree; files changed; migrations and migration-replay output; schema/RLS/storage/function changes; API and contract changes; environment variable names only; commands and exact results; concurrency/database test evidence; known issues; Human action required yes/no; manual verification checklist; and Ready for Codex audit yes/no. Separate implementation status, Codex verification, user manual verification, deployment, and production readiness. Do not claim Stage 3 passed; only Codex can audit the exit gate.
