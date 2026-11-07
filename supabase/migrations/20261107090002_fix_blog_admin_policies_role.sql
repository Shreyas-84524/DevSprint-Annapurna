-- Fix blog admin policies to target authenticated role explicitly,
-- preventing anonymous callers from attempting to evaluate internal.is_admin().

DROP POLICY IF EXISTS "Admin can view all blogs" ON public.blogs;
CREATE POLICY "Admin can view all blogs"
  ON public.blogs FOR SELECT
  TO authenticated
  USING (internal.is_admin());

DROP POLICY IF EXISTS "Admin can insert blogs" ON public.blogs;
CREATE POLICY "Admin can insert blogs"
  ON public.blogs FOR INSERT
  TO authenticated
  WITH CHECK (internal.is_admin());

DROP POLICY IF EXISTS "Admin can update blogs" ON public.blogs;
CREATE POLICY "Admin can update blogs"
  ON public.blogs FOR UPDATE
  TO authenticated
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

DROP POLICY IF EXISTS "Admin can delete blogs" ON public.blogs;
CREATE POLICY "Admin can delete blogs"
  ON public.blogs FOR DELETE
  TO authenticated
  USING (internal.is_admin());

DROP POLICY IF EXISTS "Admin can insert blog categories" ON public.blog_categories;
CREATE POLICY "Admin can insert blog categories"
  ON public.blog_categories FOR INSERT
  TO authenticated
  WITH CHECK (internal.is_admin());

DROP POLICY IF EXISTS "Admin can update blog categories" ON public.blog_categories;
CREATE POLICY "Admin can update blog categories"
  ON public.blog_categories FOR UPDATE
  TO authenticated
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

DROP POLICY IF EXISTS "Admin can delete blog categories" ON public.blog_categories;
CREATE POLICY "Admin can delete blog categories"
  ON public.blog_categories FOR DELETE
  TO authenticated
  USING (internal.is_admin());
