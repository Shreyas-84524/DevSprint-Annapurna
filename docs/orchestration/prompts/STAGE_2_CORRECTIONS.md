# Antigravity Backend — Stage 2 Second Correction Prompt

Invoke this in a new Antigravity Backend conversation rooted at a dedicated clean backend worktree:

`/teamwork-preview <paste the complete task below>`

Review and approve the generated scoping artifact before execution.

## Complete task

You are the Antigravity Backend owner for Project Annapurna Stage 2 second correction cycle. Stage 2 failed Codex re-audit on 2026-11-04. Read `AGENTS.md`, `docs/audits/STAGE_2_AUDIT.md`, `docs/orchestration/WORKING_AGREEMENT.md`, the relevant bundled Next.js 16.2.4 guides, `.agents/skills/supabase/SKILL.md`, and `.agents/skills/supabase-postgres-best-practices/SKILL.md` before changing code.

Work only in a dedicated clean worktree or clone and branch `antigravity/backend-stage-2-corrections-2`, based on commit `5661dff`. Do not use or clean the shared dirty checkout. Preserve the existing out-of-stage Geoapify work without expanding it. Do not begin Stage 3. Do not edit Codex-owned documentation or frontend-owned pages, components, context, styles, browser hooks, or browser clients. If the browser Supabase initializer requires a frontend correction, describe the exact change for a separate frontend assignment.

Task IDs are `S2-R1-01` through `S2-R1-07`.

1. Remove every automatic in-memory fallback from production verification. Test fakes must be explicitly injected from tests. Missing durable database configuration must produce a controlled fail-closed server response.
2. Make OTP challenge creation concurrency-safe and retry-safe. Enforce idempotency, cooldown, hourly limits, old-attempt expiry, and new-attempt persistence through database-enforced atomic operations. Account for the external Swift call without creating an untracked valid challenge.
3. Make verification success one database transaction that locks and conditionally consumes a still-pending challenge, stores the authoritative Swift request/proof ID, updates the profile, and rejects replay. Make failure counting atomic. Never store OTP codes.
4. Make onboarding use one callable and authorized database transaction. The current application calls a default-schema RPC while the function exists in `internal`. Remove the partial-write fallback. Prove rollback after failures at each write boundary.
5. Make admin bootstrap use only a required server-only privileged boundary. Remove request-scoped and direct-upsert fallbacks. Serialize concurrent first-admin calls so exactly one can succeed, then reliably return `409` for every later call.
6. Correct server-side fail-closed configuration behavior. Proxy must not allow protected routes through when authentication configuration is missing. Document every required environment variable by name and scope without values. Report the browser placeholder-client defect for the frontend owner rather than editing frontend-owned code.
7. Replace permissive mock assertions with exact integration evidence. A successful first admin bootstrap must return `200`, the second must return `409`, valid unverified donor and requester sessions must redirect to `/onboarding`, and verification durability must cross separate app invocations backed by one shared test database.
8. Commit a `supabase/tests` database suite covering anon, owner, another user, admin, and service operations for profiles, locations, preferences, verification attempts, verification records, views, and callable functions. Cover insert, select, update, delete, privileged field mutation, role escalation, replay, and concurrent ownership transitions as applicable.
9. Pin every `SECURITY DEFINER` function to an empty search path and fully qualify referenced objects. Revoke default execution and grant only the minimum roles. Keep privileged functions outside exposed schemas unless a deliberately reviewed RPC wrapper is necessary.
10. Prove a clean replay of every committed migration. Verify explicit Data API grants for the current Supabase behavior. Run the security advisor against the resulting intended Annapurna schema and tie the output to the applied migration list without exposing secrets.

Use the confirmed intended Supabase project only. If project identity or authentication is unavailable, mark the dependent database checks `HUMAN ACTION REQUIRED` and continue independent code and test work. Do not use another project. Do not send a live SMS without explicit user authorization.

Required verification before handoff:

- clean Supabase reset or equivalent clean migration replay from the committed history
- `supabase test db` or the project-approved real database test command
- exact first-success and second-rejection admin bootstrap tests
- concurrent admin bootstrap test
- separate-invocation durable OTP send and verify test
- duplicate-send, duplicate-verify, replay, and retry-counter concurrency tests
- onboarding rollback tests against a real test database
- valid unverified donor and requester route-denial tests
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`
- migration list and Supabase security advisor output

Return the stage/task IDs, exact base and resulting commit hashes, branch/worktree path, files changed, contract changes, migrations and environment names, commands with exit codes and counts, database test evidence, known issues, human actions, and manual checks. Separate implementation status, Codex verification, user manual verification, and deployment status. Do not push, merge, deploy, or claim Stage 2 or Stage 3 acceptance. End with `Ready for Codex re-audit: yes` only if every required non-manual check has passed.
