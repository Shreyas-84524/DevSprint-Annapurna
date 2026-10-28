# Antigravity Backend — Stage 1 Prompt

Invoke in a new Antigravity conversation rooted at a dedicated backend worktree using:

`/teamwork-preview <paste the complete task below>`

The command begins a scoping interview and prompt artifact. Review and approve that artifact before claiming execution.

## Complete task

You are the Antigravity Backend owner for Project Annapurna Stage 1. Work only in a dedicated clean worktree/clone and branch `antigravity/backend-stage-1`, based on the exact commit supplied by the user/Codex. Do not switch branches in the shared checkout. Do not edit frontend pages/components/hooks/context, planning documents, or shared package/configuration files during discovery.

Read `AGENTS.md`; read the relevant installed Next.js 16.2.4 guides in `node_modules/next/dist/docs/`; read `.agents/skills/supabase/SKILL.md` and `.agents/skills/supabase-postgres-best-practices/SKILL.md` completely and follow them. Read authoritative `docs/product`, `docs/architecture`, and `docs/orchestration`.

Task IDs: `S1-BE-01` through `S1-BE-06`.

1. Inspect Supabase MCP availability, server configuration, authentication state, and scoped project identity. Report accessible project names/references/status without secrets. The configured reference is currently reported as `xtbabyqkgirjiratjcap`; determine whether it is Annapurna or unrelated. Do not query or modify an unrelated project. Do not create/apply migrations in Stage 1.
2. Compare repository Supabase URLs/references and migration assumptions to the accessible project. Report missing/placeholder environment names without printing values.
3. Identify the user's existing OTP system integration requirements: trusted server endpoint/interface, authentication method name, proof shape, expiry/replay behavior, subject binding, error taxonomy, and test environment. Do not build or mock a replacement OTP service.
4. Audit existing migrations/RLS/functions/storage and server/API/auth code against `DATA_MODEL.md` and `API_CONTRACTS.md`. Verify role self-escalation, broad RLS, admin authorization, storage mismatch, non-atomic claim/assignment, transition rules, idempotency, sensitive projections, and Vercel runtime risks.
5. Propose the reproducible Stage 2 database setup path and clean migration strategy, including tests for RLS role matrices and concurrency. Do not mutate a remote project.
6. Run relevant read-only checks and report actual evidence. Discover CLI commands with `--help`; do not guess flags.

Canonical persisted roles are `donor`, `requester`, `volunteer`, `admin`; `beneficiary` is legacy UI terminology. Public signup cannot choose admin. Food QC is distinct from identity verification. Aadhaar, payments, payouts, wallets, tax receipts, NGO management, and manual volunteer approval are excluded.

### HUMAN ACTION REQUIRED protocol

When an account action, credential, API key, service connection, OTP interface detail, environment update, device permission, or product decision is needed: interrupt dependent work with `HUMAN ACTION REQUIRED`; state the exact dependency and blocked task; give the smallest concrete user action; explain secure secret placement and never request committed/chat secrets; list independent work that can continue; and state how you will verify it afterward. Pause only dependent work. Never invent credentials, bypass verification, use another project, or label mocks as integrations.

### Required handoff

Report Stage/task IDs; base/resulting commit; branch/worktree; files changed; implemented behavior (expected to be discovery only); contract proposals; migrations/environment/API changes (`none` for remote state); commands/results; accessible project status without secrets; known issues; Human action required yes/no; exact manual verification checklist; Ready for Codex audit yes/no. Separate implementation, Codex verification, user manual verification, and deployment status. Do not claim `/teamwork-preview` execution merely because the prompt artifact exists.
