# File Structure and Ownership

Status: Stage 1 proposed structure fitted to the current App Router repository

## Proposed paths

```text
src/
  app/
    (auth)/                    frontend pages
    (public)/                  frontend pages
    dashboard/                 frontend pages
    admin/                     frontend pages
    api/                       backend Route Handlers
  components/                  frontend
  hooks/                       frontend browser hooks
  context/                     frontend state/subscriptions
  lib/
    browser/                   frontend browser clients
  server/                      backend-only DAL, authz, services, adapters
  types/
    contracts.ts               shared contract source; backend sole editor
  services/                    legacy; migrate by responsibility, not wholesale
supabase/
  migrations/                 backend
  seed.sql                     backend development seed
  tests/                       backend database/RLS/concurrency tests
docs/                          Codex
```

Do not refactor the repository merely to match this tree. Add paths only when implementation needs them.

## Ownership table

| Actual or proposed path | Owner | Notes |
|---|---|---|
| `src/app/**/page.tsx`, `layout.tsx`, loading/error UI | Frontend | Includes auth, dashboards, admin, responsive behavior |
| `src/app/api/**/route.ts` | Backend | Public HTTP endpoints; authn/authz required |
| `src/components/**`, `src/hooks/**`, `src/context/**` | Frontend | Maps, GPS, Realtime client/reconnect, UI state |
| `src/lib/browser/**` and browser-safe API clients | Frontend | No secrets or privileged clients |
| `src/server/**` | Backend | `server-only` DAL, authorization, DTOs, business rules, ORS adapter/cache |
| `src/lib/supabase-server.ts`, future server auth clients | Backend | Frontend consumes endpoints/contracts |
| `src/types/contracts.ts` and generated DB types | Backend | Sole editor; frontend consumes; Codex approves contract changes |
| `src/types/index.ts` | Backend during migration | Shared legacy file; frontend requests changes through contract handoff |
| `supabase/**` | Backend | Migrations, RLS, storage, functions, seed, database tests |
| `docs/**` | Codex | Authoritative plans, prompts, contracts, status, audits |
| `package.json`, `package-lock.json` | Stage-designated single writer | Backend in Stages 2-3; Frontend in Stage 4 only if Leaflet test/runtime changes are needed; coordinate batches |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` | Backend single writer | Frontend proposes requirements; backend owns runtime/security config |
| `.env.example`, Vercel variable documentation | Backend | Names only, never secret values |
| `public/**` | Frontend | Storage-backed user uploads do not belong here |

## Isolation

Each worker uses its own clean worktree or clone and branch from the same recorded stage base:

- `antigravity/frontend-stage-<n>` in a frontend worktree.
- `antigravity/backend-stage-<n>` in a backend worktree.

Workers must not switch branches in the shared user checkout. Codex integrates reviewed commits into a separate integration worktree. The current shared checkout is dirty and must not be used as either worker's implementation worktree.

## Shared-file protocol

1. The non-owner proposes the exact change in its handoff.
2. The designated writer applies the accepted batch.
3. Both workers rebase or cherry-pick only after Codex records the integrated commit.
4. Lockfile edits are never hand-merged blindly; regenerate with the designated package manager and verify.
