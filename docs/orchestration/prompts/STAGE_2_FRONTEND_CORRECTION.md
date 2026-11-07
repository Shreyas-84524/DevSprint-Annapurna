# Antigravity Frontend — Stage 2 Configuration Correction Prompt

Invoke this in a new Antigravity Frontend conversation rooted at a dedicated clean frontend worktree:

`/teamwork-preview <paste the complete task below>`

Review and approve the generated scoping artifact before execution.

## Complete task

You are the Antigravity Frontend owner for one Stage 2 re-audit correction in Project Annapurna. Read `AGENTS.md`, `docs/audits/STAGE_2_AUDIT.md`, `docs/orchestration/WORKING_AGREEMENT.md`, and the relevant bundled Next.js 16.2.4 guides before changing code.

Work only in a dedicated clean worktree or clone and branch `antigravity/frontend-stage-2-correction-2`, based on commit `5661dff`. Do not use or clean the shared dirty checkout. Do not begin Stage 3 and do not edit backend-owned server, API, Supabase, migration, runtime configuration, contract type, package, or lock files. Do not adopt the shared checkout's uncommitted `FoodContext` mock/fallback changes.

Task ID: `S2-R1-05-FE`.

Correct the browser Supabase initializer in `src/lib/supabase.ts` so production code never constructs a client from placeholder credentials. Use the Stage 2 environment names already documented by the backend. Missing or invalid public configuration must fail closed with a controlled, testable result that does not silently switch the application to mock or local production behavior. Preserve normal browser behavior when valid configuration exists.

Add the smallest focused frontend test needed to prove valid configuration succeeds and missing configuration cannot create a placeholder-backed client. Coordinate any package or shared test-harness requirement through the designated Stage 2 Backend writer rather than editing package or lock files yourself.

Required verification before handoff:

- focused browser-client configuration tests
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`

Return the task ID, exact base and resulting commit hashes, branch/worktree path, files changed, test results, known issues, and manual checks. Do not push, merge, deploy, or claim Stage 2 acceptance. End with `Ready for Codex re-audit: yes` only if every required check passes.
