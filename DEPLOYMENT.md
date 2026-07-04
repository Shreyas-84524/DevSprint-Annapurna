# Deployment Instructions — Annapurna Foundation v2.0

Guide to deploying the Next.js and Supabase stack to production.

---

## 1. Vercel Deployment
We recommend deploying the Next.js frontend using Vercel.
1. Connect your repository to Vercel.
2. In the project settings, configure the following environment variables:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `NEXT_PUBLIC_ORS_API_KEY`
   * `RESEND_API_KEY`
3. Click **Deploy**. Vercel will automatically compile the pages and spin up the global edge middleware.

---

## 2. Production Database Deployment
1. Set up a production database instance in Supabase.
2. Go to the SQL Editor and apply the migration script:
   `supabase/migrations/20260703000002_full_schema.sql`
3. Make sure to double-check Row Level Security (RLS) is enabled:
   ```sql
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ```

---

## 3. Production Storage Security Checklist
Ensure the private buckets have public access turned OFF:
* `avatars` — Private (Write: authenticated owners; Read: authenticated/system).
* `receipts` — Private (Write: system; Read: authenticated donors).
* `documents` — Private (Write: authenticated volunteers; Read: admin).

Ensure the public buckets have public access turned ON:
* `blogs` — Public.
* `gallery` — Public.

---

## 4. Custom Domains & SMTP
1. In Vercel, navigate to **Settings > Domains** to configure your custom domain name.
2. In Supabase, configure custom SMTP credentials under **Settings > Auth > Email Provider** to ensure welcome and recovery messages are sent using your foundation email address.
