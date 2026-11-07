# Stage 5 Independent Audit

Date: 2026-11-07 (Asia/Calcutta)

Audited commits:

1. `61c2d2f` — `feat(support): secure CMS contact and notifications`
2. `e3a439d` — `feat(ui): reconnect supporting experiences`
3. `9f82d3e` — `test(release): harden integration and recovery paths`

Decision: `REPAIRED WITH UNCOMMITTED CHANGES`

## Confirmed report evidence

- The three reported commits exist sequentially on `main` and `origin/main` at the start of the audit.
- The repository had one branch, one worktree, a clean tracked tree, and the pre-consolidation stash remained untouched.
- The reported application test, type, lint, and production-build baseline was reproducible in substance.
- No hosted Supabase migration or Vercel deployment was performed during the audit.

## Findings and repairs

### S5-A01 — Critical: frontend services did not parse the real API envelope

Routes return `{ data, error }`, while the Blog, Event, FAQ, Gallery, Contact, Notification, Admin Stats, and upload clients read unrelated top-level fields such as `blogs`, `events`, `notifications`, `url`, or the entire response. Mock tests reproduced the incorrect format, so they passed while the real UI would show empty data or fail after upload.

Repair: clients and direct page fetches now read the actual `data` envelope, nested API errors are parsed correctly, and UI service fixtures exercise the real response shape.

### S5-A02 — High: contact throttling was not durable and could be bypassed

The five-per-hour limit used a process-local `Map`, which is ineffective across Vercel instances and resets on cold start. The Data API also granted anonymous inserts directly into `contact_messages`, bypassing server validation and throttling; the legacy `contact_inquiries` insert path remained open as well.

Repair: forward migration `20261107090001_stage5_audit_repairs.sql` adds an atomic, advisory-lock-protected database limiter and a service-role-only `submit_contact_message` RPC. The server hashes the IP/email rate identity before persistence. Direct client grants and bypass policies are revoked for both contact tables. Unit-test injection retains an isolated test limiter only; production always uses PostgreSQL.

### S5-A03 — High: clients could forge workflow notifications

Authenticated clients had direct `INSERT` permission and an RLS policy allowing them to create arbitrary notifications for themselves. Idempotency replay returned an existing row without checking whether the user, content, type, link, and metadata matched the original command.

Repair: direct notification insert/update/read grants are revoked from client roles because the authorized API owns these operations. Idempotency reuse is now exact-payload bound, unsafe links are rejected in application code and constrained in PostgreSQL, and the notification UI ignores unsafe persisted links.

### S5-A04 — High: public CMS reads lacked publication boundaries

Events, FAQs, and Gallery rows had no published/draft attribute and public RLS used `USING (true)`. Their server reads used the service role, bypassing RLS entirely.

Repair: the forward migration adds indexed `is_published` boundaries and replaces public policies. Public CMS reads now use an anon Supabase client, explicit safe projections, and an `is_published = true` filter.

### S5-A05 — High: CMS upload validation trusted declared MIME type

The upload route buffered the entire file before enforcing limits, and the DAL accepted a declared image MIME type without checking file signatures. Unexpected errors also returned raw internal messages.

Repair: type and size are checked before buffering, JPEG/PNG/WebP signatures are verified, server errors are sanitized, and the broad Storage select policy that enabled bucket enumeration is removed. Public object URLs remain available through the public bucket.

### S5-A06 — High: stored blog content allowed HTML injection

Published blog content was passed directly to `dangerouslySetInnerHTML` without a sanitizer.

Repair: blog content is rendered as text with preserved whitespace. No untrusted HTML is injected.

### S5-A07 — Medium: optimistic notification reads did not recover

The notification service returns errors as values, but the bell ignored those values and treated failed mark-as-read calls as success.

Repair: single and bulk optimistic updates now detect returned errors and refresh canonical server state when any update fails.

### S5-A08 — Medium: dead account-help link remained

The login page retained a `href="#"` password-reset action.

Repair: the dead link is replaced with a real account-help route to Contact.

### S5-A09 — High: database evidence was overstated

The committed pgTAP suite asserted table existence, RLS flags, and grants but did not test public publication visibility or durable contact limiting. Node suites use in-memory Supabase substitutes and are not PostgreSQL evidence.

Repair: the pgTAP plan now covers publication visibility, restricted direct grants, service-role-only contact RPC execution, Storage enumeration policy removal, indexes, safe notification links, and the five-allowed/sixth-denied database rate limit. It remains unexecuted until a disposable PostgreSQL/Supabase environment is available.

## Verification after repair

| Check | Result |
|---|---|
| `npm test` | Pass: 221 tests, 64 suites, 0 failures |
| `npx tsc --noEmit` | Pass: 0 errors |
| `npm run lint` | Pass: 0 errors, 18 warnings |
| `npm run build` | Pass outside the restricted sandbox: Next.js 16.2.4, 49 pages generated |
| `git diff --check` | Pass; line-ending warning only |
| `supabase test db` | Attempted; local PostgreSQL at `127.0.0.1:54322` refused the connection because the Supabase/Docker stack is not running |

The first sandboxed build attempt hit a Turbopack child-process creation panic while processing `globals.css`. Re-running the same build outside the restricted sandbox passed, confirming an execution-environment failure rather than an application build defect.

## Current repository state

- No audit repair commit was created.
- No audit repair was pushed.
- `main` and `origin/main` remain at `9f82d3e`.
- The repair is present only as working-tree changes for the Stage 6 commit sequence.
- The existing stash remains untouched.
- Hosted Supabase and Vercel remain unmodified.

## Stage 6 entry condition

Before deployment, Stage 6 must commit these repairs, replay the full migration chain on a disposable environment, execute `supabase test db`, resolve any SQL/RLS failures, and only then request approval for hosted migration application and Vercel Preview deployment.
