<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Annapurna ownership rules

- Antigravity Frontend owns pages/layouts, UI/components/styles, browser hooks and API clients, Leaflet/GPS/Realtime browser behavior, frontend tests, and frontend fixes.
- Antigravity Backend owns `src/app/api`, server services/authz, Supabase schema/migrations/RLS/functions/storage, OTP proof integration, workflow/routing/tracking persistence, backend tests, and Vercel runtime configuration.
- Codex owns `docs/`, contracts, prompts, status, integration audits, and correction assignments. Codex does not silently implement application fixes.
- `src/types/contracts.ts`, generated database types, package/lock files, and runtime configuration have one designated writer at a time as recorded in `docs/architecture/FILE_STRUCTURE.md`.
- Use separate branches and worktrees/clones. Never let frontend and backend workers edit the same checkout.
- On audit failure, return the defect to the responsible owner and re-audit the resulting code.
