# Vercel Deployment Plan

Status: planning only; no deployment performed

## Principles

- Deploy Preview before Production.
- Run migrations deliberately through an authenticated release step; never from every build.
- Vercel functions are stateless. Do not depend on local persistent files, long-lived memory, or a custom persistent WebSocket server.
- Supabase Realtime supplies authorized updates.
- Keep secret/service credentials server-side. Browser variables are limited to intentionally publishable values.

## Planned environment names

Final names are backend-owned and must be verified in Stage 6. Expected categories are:

- Publishable Supabase URL and publishable key for browser/server clients.
- Server-only Supabase secret/service key only where a narrowly scoped privileged operation truly requires it.
- `SWIFT_BASE_URL` and server-only `SWIFT_PROJECT_KEY` for SMS verification.
- Server-only `ORS_API_KEY` through the routing adapter.
- Application base URL and allowed redirect origins.

Do not commit values. Preview and Production values/scopes are recorded separately.

## Release sequence

1. Record commit, branch, migration list/hash, and rollback point.
2. Apply and verify migrations against the intended Preview backend.
3. Configure Preview environment names and Supabase Auth redirects/storage/Realtime.
4. Deploy Preview and run automated/integration checks.
5. Run the user manual checklist on intended browsers/devices.
6. Record failures and route corrections through the owner/audit loop.
7. Promote only after readiness review; production remains a separate decision.

## Required release record

- Tested commit and repository state.
- Vercel Preview URL and deployment timestamp.
- Supabase project reference/region and migration state without secrets.
- Environment variable names and scopes, not values.
- Automated commands/results and user manual result separately.
- Known external/device limitations.
- Migration recovery and Vercel rollback instructions tested or explicitly unverified.

## Stage 6 research gate

Before configuration, Codex re-checks current official Next.js, Vercel, Supabase, OpenRouteService/HeiGIT, and basemap documentation and free-plan limits. No paid resource is selected silently.
