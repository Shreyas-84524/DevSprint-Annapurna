# Vercel Deployment & Release Guide

## Principles

1. **Deploy Preview before Production**: All changes must be verified in an ephemeral or branch Preview deployment before any Production promotion.
2. **Stateless Functions**: Vercel Serverless Functions are stateless. The application does not depend on local persistent filesystem files, long-lived in-memory caches across invocations, or a custom persistent WebSocket server.
3. **Database-Backed State**: Throttling, notifications, listings, deliveries, and tracking reside in Supabase PostgreSQL.
4. **Supabase Realtime**: Live delivery updates are powered by Supabase Realtime WebSocket connections directly from the browser client, not long-polling or custom socket daemons on Vercel.
5. **Least Privilege Secrets**: Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BOOTSTRAP_SECRET`, `SWIFT_PROJECT_KEY`, `GEOAPIFY_API_KEY`) must never be prefixed with `NEXT_PUBLIC_` or bundled in browser code.
6. **Deliberate Migrations**: Database migrations are an explicit, authenticated release action. Migrations are NEVER run automatically as part of the Vercel build command (`next build`).

---

## Environment Variables Specification

The application requires the following environment variables. Values must never be committed to git.

| Variable Name | Scope | Environments | Purpose & Validation Rules |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Browser & Server) | Preview, Production | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Browser & Server) | Preview, Production | Supabase anonymous public key for client-side Auth and RLS-scoped data access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only Secret | Preview, Production | Privileged key for `internal.is_admin()` checks, admin bootstrap, and `submit_contact_message` RPC. Never expose to client! |
| `NEXT_PUBLIC_APP_URL` | Public (Browser & Server) | Preview, Production | Base canonical URL of the application. Preview: `https://<deployment>.vercel.app`; Production: `https://annapurna.org`. |
| `ADMIN_BOOTSTRAP_SECRET` | Server-Only Secret | Preview, Production | Secret token for `/api/admin/bootstrap`. Minimum 16 characters. |
| `SWIFT_BASE_URL` | Server-Only | Preview, Production | Swift SMS service URL (`https://global-otp-service.vercel.app`). |
| `SWIFT_PROJECT_KEY` | Server-Only Secret | Preview, Production | Upstream Swift SMS project API key for donor/requester mobile verification. |
| `GEOAPIFY_API_KEY` | Server-Only Secret | Preview, Production | API key for server-side routing polyline generation (`/api/routing`). |
| `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` | Public (Browser) | Preview, Production | Optional Geoapify tile style key. Falls back cleanly to OpenStreetMap standard tiles if unset. |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Server-Only Secret | Preview, Production | Optional webhook for external reporting sync (`/api/sync`). |

---

## Supabase Service Configuration

### 1. Authentication & Redirect URLs
In Supabase Dashboard > Authentication > URL Configuration:
- **Site URL**:
  - Preview: `https://<project-name>-preview.vercel.app` (or specific preview domain)
  - Production: `https://annapurna.org`
- **Redirect URLs (Allow list)**:
  - `http://localhost:3000/**` (local development)
  - `https://*.vercel.app/**` (all Vercel preview branch deployments)
  - `https://annapurna.org/**` (production)
  - `https://www.annapurna.org/**` (production alias)

### 2. Storage Buckets
The application requires two Supabase Storage buckets configured:
1. `cms-assets`:
   - Public: `true`
   - File size limit: 5 MB (application enforces <= 4.5 MB to respect Vercel function payload limits)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Access: Read is public via object URL. Direct bucket enumeration via `storage.objects` is revoked; mutations are restricted to authenticated admins.
2. `listing-images`:
   - Public: `true`
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Access: Public read, authenticated donor insert.

### 3. Realtime Publication
In Supabase Dashboard > Database > Publications:
- Ensure the `supabase_realtime` publication includes the `deliveries` table so status transitions and tracking updates trigger browser subscribers.

---

## Migration Release Procedure

Migrations must be run deliberately prior to or in conjunction with application deployments.

### Complete Migration Chain in Order:
1. `supabase/migrations/20261101000000_core_schema.sql`
2. `supabase/migrations/20261102000000_profiles_and_roles.sql`
3. `supabase/migrations/20261103000000_listings_and_claims.sql`
4. `supabase/migrations/20261104000000_deliveries_and_tracking.sql`
5. `supabase/migrations/20261107090000_secure_cms_contact_notifications.sql`
6. `supabase/migrations/20261107090001_stage5_audit_repairs.sql`
7. `supabase/migrations/20261107090002_fix_blog_admin_policies_role.sql`

### Production Database Target:
- Project Reference: `xtbabyqkgirjiratjcap`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- Applied Migrations: 7/7 applied forward-only
- Database Health & Security: 0 security errors, 0 health errors via Supabase Advisors
- Database Acceptance Test: 36/36 assertions passed via pgTAP on remote PostgreSQL
- Supabase Realtime: `public.deliveries` added to `supabase_realtime` publication

### Safe Migration Execution Command:
```bash
# Verify pending migrations against linked Supabase project
npx supabase migration list

# Apply pending migrations forward-only
npx supabase db push --remote --include-all --yes
```

### Rollback & Forward Recovery Limitations:
- **Never attempt destructive automated rollbacks (`db reset`) on staging or production data.**
- In PostgreSQL, rolling back schema drops tables and columns, permanently deleting user data.
- If a migration defect occurs, author an emergency **forward corrective migration** (`20261107xxxxxx_fix_description.sql`) that alters the tables or policies safely without data loss.

---

## Vercel Deployment & Rollback Protocol

### Production & Preview Targets:
- **Vercel Team / Scope**: `shreyas-84524`
- **Vercel Project**: `annapurna` (`prj_O1Z7fYVBhKIk4xMcWfo5KEXtooRo`)
- **Preview Deployment**: `https://annapurna-f8i9s645j-shreyas-projects-0284524c.vercel.app` (`dpl_6Zp1tUrA3bisoQNC3HrkEZGYMQ9P`)
- **Production Deployment**: `https://annapurna-steel.vercel.app` (`dpl_tZZHNKBZu9qwkcn5GJuhphnBNG7T`)
- **Live Smoke Verification**: 16/16 route and API smoke tests passing

### Preview Deployment:
1. Push git branch or trigger Vercel CLI:
   ```bash
   vercel --preview
   ```
2. Verify build log:
   - Ensure Next.js 16 App Router builds 49/49 pages cleanly.
   - Verify environment variables are resolved for the Preview environment.

### Production Promotion:
```bash
vercel deploy --prod --yes
```

### Instant Rollback on Vercel:
1. Open Vercel Dashboard > Project > Deployments.
2. Select the last known healthy deployment (e.g. previous deployment ID).
3. Click the `...` menu > **Instant Rollback** (or **Promote to Production** if reverting a production release).
4. Traffic is redirected immediately at the edge without a rebuild. Alternatively, execute via CLI:
   ```bash
   vercel rollback <deployment-id> --yes
   ```

---

## Free-Tier Constraints & Operational Limits

The application operates within the following free-tier limits:

1. **Vercel Hobby**:
   - Serverless function timeout: max 300 seconds (default 15s; adequate for API route handlers).
   - Serverless request/response payload: **4.5 MB** maximum. The application enforces pre-flight image checks to reject payloads > 4.5 MB before transmission.
   - Monthly bandwidth: 100 GB.
2. **Supabase Free Tier**:
   - Database storage: 500 MB.
   - File storage: 1 GB.
   - Realtime messages: 2M / month; 200 peak concurrent connections.
   - Inactivity pause: projects pause after 7 days of inactivity (unpause manually in dashboard).
3. **OpenRouteService Free Tier**:
   - Rate limit: 40 requests/minute, 2,000 requests/day for directions.
   - Application implements in-memory route caching to prevent redundant requests on common routes.
4. **OpenStreetMap Tiles**:
   - Public tile servers require standard caching headers and low concurrency (< 2 simultaneous threads).
