-- Full Database Schema Migration for Annapurna Foundation v2.0
-- Created: 2026-07-03

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'donor', 'volunteer', 'ngo', 'admin')),
  PRIMARY KEY (user_id, role)
);

-- 2. Create partner_ngos table
CREATE TABLE IF NOT EXISTS public.partner_ngos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create beneficiaries table
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID REFERENCES public.partner_ngos(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create volunteer_applications table
CREATE TABLE IF NOT EXISTS public.volunteer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  aadhaar TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create volunteer_assignments table
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  food_donation_id UUID REFERENCES public.food_donations(id) ON DELETE SET NULL,
  delivery_location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN (
    'pending',
    'assigned',
    'accepted',
    'travelling_to_donor',
    'food_collected',
    'travelling_to_beneficiary',
    'delivered',
    'completed',
    'cancelled'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create volunteer_compensation table
CREATE TABLE IF NOT EXISTS public.volunteer_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.volunteer_assignments(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  distance_km NUMERIC NOT NULL,
  rate_per_km NUMERIC DEFAULT 10 NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- 8. Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Create donation_receipts table
CREATE TABLE IF NOT EXISTS public.donation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monetary_donation_id UUID REFERENCES public.monetary_donations(id) ON DELETE SET NULL,
  food_donation_id UUID REFERENCES public.food_donations(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Create faqs table
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Create gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- 15. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Setup basic RLS select/insert policies

-- User Roles: select for self, manage for admin
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Partner NGOs & Beneficiaries: viewable by authenticated users
CREATE POLICY "NGOs viewable by authenticated users" ON public.partner_ngos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Beneficiaries viewable by authenticated users" ON public.beneficiaries FOR SELECT USING (auth.role() = 'authenticated');

-- Volunteer applications & assignments
CREATE POLICY "Users can view and manage their own applications" ON public.volunteer_applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their assignments" ON public.volunteer_assignments FOR SELECT USING (auth.uid() = volunteer_id);
CREATE POLICY "Volunteers can update their assignments" ON public.volunteer_assignments FOR UPDATE USING (auth.uid() = volunteer_id);

-- Volunteer Compensation
CREATE POLICY "Volunteers can view their compensation" ON public.volunteer_compensation FOR SELECT USING (auth.uid() = volunteer_id);

-- Publicly viewable tables: blogs, categories, faqs, events, gallery
CREATE POLICY "Anyone can view categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view blogs" ON public.blogs FOR SELECT USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY "Anyone can view faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Anyone can view gallery" ON public.gallery FOR SELECT USING (true);

-- Contact messages: insert is public
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- Receipts
CREATE POLICY "Users can view receipts for their donations" ON public.donation_receipts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.monetary_donations 
    WHERE monetary_donations.id = monetary_donation_id AND monetary_donations.donor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.food_donations
    WHERE food_donations.id = food_donation_id AND food_donations.donor_id = auth.uid()
  )
);

-- Administrative Tables: settings, logs
CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can view activity logs" ON public.activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create Storage Buckets using SQL
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', false),
  ('blogs', 'blogs', true),
  ('gallery', 'gallery', true),
  ('receipts', 'receipts', false),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
