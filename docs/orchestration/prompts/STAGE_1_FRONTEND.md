# Antigravity Frontend — Stage 1 Prompt

Invoke in a new Antigravity conversation rooted at a dedicated frontend worktree using:

`/teamwork-preview <paste the complete task below>`

The command begins a scoping interview and prompt artifact. Review and approve that artifact before claiming execution.

## Complete task

You are the Antigravity Frontend owner for Project Annapurna Stage 1. Work only in a dedicated clean worktree/clone and branch `antigravity/frontend-stage-1`, based on the exact commit supplied by the user/Codex. Do not switch branches in the shared checkout. Do not edit backend-owned files, planning documents, API route handlers, Supabase files, server services, shared contract types, package manifests, lockfiles, or runtime configuration.

Read `AGENTS.md`, then read the relevant installed Next.js 16.2.4 guides in `node_modules/next/dist/docs/` before conclusions or code. Read the authoritative files under `docs/product`, `docs/architecture`, and `docs/orchestration`.

Task IDs: `S1-FE-01` through `S1-FE-05`.

1. Inventory every frontend route, layout, component, browser service/client, context, Realtime subscription, map dependency, and frontend mock. Produce a route-to-data-dependency matrix with authentication/role expectations.
2. Identify reusable UI and the smallest changes needed for canonical roles `donor`, `requester`, `volunteer`, `admin`; record every `beneficiary` compatibility surface.
3. Verify broken/incomplete flows against actual code, especially hardcoded volunteer auth routing, absent role onboarding, direct Supabase workflow writes, loading/error/empty/reconnect states, map coordinate wiring, browser GPS handling, CMS UI, mock payment/sponsor/wallet/Aadhaar/UPI production paths, and mobile/accessibility issues.
4. Map current frontend calls to `docs/architecture/API_CONTRACTS.md`. Do not invent backend responses. List contract questions as proposals for Codex/backend.
5. Run frontend-relevant read-only checks. Do not implement Stage 2 UI yet. You may create a frontend inventory/handoff artifact only if it is in your own worker handoff location; do not edit Codex-owned documents.

Preserve useful existing frontend and avoid repository-wide refactoring. Do not weaken requirements or label mock data/integrations as working.

### HUMAN ACTION REQUIRED protocol

When an account action, credential, API key, service connection, OTP interface detail, environment update, device permission, or product decision is needed: interrupt dependent work with `HUMAN ACTION REQUIRED`; state the exact dependency and blocked task; give the smallest concrete user action; explain secure secret placement and never request committed/chat secrets; list independent work that can continue; and state how you will verify it afterward. Pause only dependent work.

### Required handoff

Report Stage/task IDs; base/resulting commit; branch/worktree; files changed; implemented behavior (expected to be inventory only); contract proposals; migrations/environment/API changes (`none` unless reporting a dependency); commands/results; known issues; Human action required yes/no; exact manual verification checklist; Ready for Codex audit yes/no. Separate implementation, Codex verification, user manual verification, and deployment status. Do not claim `/teamwork-preview` execution merely because the prompt artifact exists.
