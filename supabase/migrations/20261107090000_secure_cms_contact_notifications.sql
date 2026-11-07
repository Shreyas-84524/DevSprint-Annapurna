-- Project Annapurna Milestone 5: Secure CMS, Contact, and Notifications
-- Forward-only migration adding events, faqs, gallery, contact_messages, and notifications
-- with least-privilege RLS policies, internal.is_admin() authorization, and hardened storage.

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL CHECK (char_length(location) >= 3 AND char_length(location) <= 255),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 2. FAQs Table
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL CHECK (char_length(question) >= 5 AND char_length(question) <= 500),
  answer TEXT NOT NULL CHECK (char_length(answer) >= 5),
  category TEXT NOT NULL DEFAULT 'General' CHECK (char_length(category) <= 50),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 3. Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 255),
  image_url TEXT NOT NULL CHECK (char_length(image_url) >= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 4. Contact Messages Table (strictly not publicly enumerable)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  email TEXT NOT NULL CHECK (char_length(email) >= 5 AND char_length(email) <= 255),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  message TEXT NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 3000),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
  message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'claim', 'delivery', 'qc', 'system')),
  link TEXT CHECK (link IS NULL OR char_length(link) <= 500),
  read BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  read_at TIMESTAMPTZ
);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency ON public.notifications (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS on all added tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Also ensure blogs policies allow admin mutations and admin view of drafts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Admin can view all blogs'
  ) THEN
    CREATE POLICY "Admin can view all blogs"
      ON public.blogs FOR SELECT
      USING (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Admin can insert blogs'
  ) THEN
    CREATE POLICY "Admin can insert blogs"
      ON public.blogs FOR INSERT
      WITH CHECK (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Admin can update blogs'
  ) THEN
    CREATE POLICY "Admin can update blogs"
      ON public.blogs FOR UPDATE
      USING (internal.is_admin())
      WITH CHECK (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Admin can delete blogs'
  ) THEN
    CREATE POLICY "Admin can delete blogs"
      ON public.blogs FOR DELETE
      USING (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Admin can insert blog categories'
  ) THEN
    CREATE POLICY "Admin can insert blog categories"
      ON public.blog_categories FOR INSERT
      WITH CHECK (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Admin can update blog categories'
  ) THEN
    CREATE POLICY "Admin can update blog categories"
      ON public.blog_categories FOR UPDATE
      USING (internal.is_admin())
      WITH CHECK (internal.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Admin can delete blog categories'
  ) THEN
    CREATE POLICY "Admin can delete blog categories"
      ON public.blog_categories FOR DELETE
      USING (internal.is_admin());
  END IF;
END $$;

-- Policies for Events
CREATE POLICY "Public can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert events"
  ON public.events FOR INSERT
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can update events"
  ON public.events FOR UPDATE
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can delete events"
  ON public.events FOR DELETE
  USING (internal.is_admin());

-- Policies for FAQs
CREATE POLICY "Public can view faqs"
  ON public.faqs FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert faqs"
  ON public.faqs FOR INSERT
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can update faqs"
  ON public.faqs FOR UPDATE
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can delete faqs"
  ON public.faqs FOR DELETE
  USING (internal.is_admin());

-- Policies for Gallery
CREATE POLICY "Public can view gallery"
  ON public.gallery FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert gallery"
  ON public.gallery FOR INSERT
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can delete gallery"
  ON public.gallery FOR DELETE
  USING (internal.is_admin());

-- Policies for Contact Messages (NEVER publicly selectable)
CREATE POLICY "Admin can view contact messages"
  ON public.contact_messages FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update contact messages"
  ON public.contact_messages FOR UPDATE
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can delete contact messages"
  ON public.contact_messages FOR DELETE
  USING (internal.is_admin());

-- Policies for Notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR internal.is_admin());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()) OR internal.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR internal.is_admin());

CREATE POLICY "Admin or self can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()) OR internal.is_admin());

-- Table Grants (least-privilege)
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT SELECT ON public.gallery TO anon, authenticated;
GRANT SELECT ON public.blogs TO anon, authenticated;
GRANT SELECT ON public.blog_categories TO anon, authenticated;

-- Contact messages: insert allowed for public submission; read/update/delete only for authenticated admin
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;

-- Notifications: select/update for authenticated users on their own records
GRANT SELECT, UPDATE, INSERT ON public.notifications TO authenticated;

-- Storage bucket for hardened CMS assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-assets',
  'cms-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'cms_assets_storage_select'
  ) THEN
    CREATE POLICY "cms_assets_storage_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'cms-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'cms_assets_storage_insert'
  ) THEN
    CREATE POLICY "cms_assets_storage_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'cms-assets'
        AND internal.is_admin()
        AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'cms_assets_storage_update'
  ) THEN
    CREATE POLICY "cms_assets_storage_update"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'cms-assets'
        AND internal.is_admin()
      )
      WITH CHECK (
        bucket_id = 'cms-assets'
        AND internal.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'cms_assets_storage_delete'
  ) THEN
    CREATE POLICY "cms_assets_storage_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'cms-assets'
        AND internal.is_admin()
      );
  END IF;
END $$;
