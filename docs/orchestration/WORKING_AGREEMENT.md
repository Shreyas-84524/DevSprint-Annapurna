# Working Agreement

## Fixed owners

Antigravity Frontend exclusively owns pages, layouts, components, styling, browser hooks/API clients, browser GPS, Leaflet rendering, Realtime client behavior, frontend states/tests/fixes.

Antigravity Backend exclusively owns Supabase discovery/configuration, schema/migrations/RLS/functions/storage, server authentication/authorization, the existing OTP integration, Route Handlers, validation/business rules, atomic workflow operations, tracking persistence, routing adapter/cache, backend tests/fixes, and Vercel runtime configuration.

Codex owns discovery, authoritative planning/contracts/prompts, integration review, executed checks, audit evidence, correction assignment, re-audit, and manual checklists. Codex does not silently fix application code.

## Antigravity command behavior

Official syntax is `/teamwork-preview <task>` (alias `/teamwork`). It is available on paid plans in the Antigravity App and CLI. It starts a Phase 1 scoping interview and creates a prompt artifact; it does not prove implementation began. Autonomous team execution starts only after the user approves that artifact.

Useful supported commands are `/plan <task>` for a reviewable implementation plan, `/grill-me <task>` for targeted requirements questions, `/boost <task>` for hard interactive reasoning, `/browser <task>` for browser research/testing, and `/goal <task>` for continuous execution. They are not automatically combined and must not be claimed as executed unless invoked.

Sources: [Teamwork guide](https://antigravity.google/docs/teamwork/), [slash command catalog](https://www.antigravity.google/docs/slash-commands), [CLI reference](https://www.antigravity.google/docs/cli/reference/).

## Handoff format

Every worker reports:

- Stage and task IDs.
- Base and resulting commit.
- Branch and worktree/clone path.
- Files changed and implemented behavior.
- Contract changes.
- Migrations, environment names, and external API changes.
- Commands actually executed with exit status and relevant counts.
- Known issues.
- Human action required: yes/no with exact action.
- Manual verification checklist.
- Ready for Codex audit: yes/no.

Status is always separated into implementation, Codex verification, user manual verification, and deployment.

## Human intervention protocol

In every stage and prompt, when an account action, credential, API key, service connection, OTP detail, environment update, device permission, or product decision is needed:

1. Interrupt dependent work with `HUMAN ACTION REQUIRED`.
2. State the exact missing dependency and blocked task.
3. Give the smallest concrete user action.
4. Explain secure secret placement; never request secrets in committed files or public reports.
5. List useful independent work that can continue.
6. State how the dependency will be verified afterward.

Only dependent work pauses. Workers must not invent credentials, bypass verification, use another project, or label mocks as integrations.

## Audit loop

For each stage Codex publishes both prompts, receives actual commits/handoffs, reviews diffs against the recorded base, integrates in a clean worktree, runs relevant checks, records `PASS`, `FAIL`, or `BLOCKED`, assigns every failure, issues a correction prompt, and re-audits. A worker claim or build alone is not workflow evidence.

Each finding records severity, file/function, expected and observed behavior, reproduction/evidence, owner, and acceptance criteria. Tests and requirements are not weakened to obtain a pass.
