-- Initialize Core Database Schema for Project Annapurna

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table (canonical user profile connected to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2 AND char_length(display_name) <= 100),
  role TEXT NOT NULL CHECK (role IN ('donor', 'requester', 'volunteer', 'admin')),
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Backward-compatibility view for public.users
CREATE OR REPLACE VIEW public.users
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.display_name AS name,
    p.phone,
    p.role,
    0 AS earnings,
    p.created_at
  FROM public.profiles p;

-- 3. Food donations table
CREATE TABLE IF NOT EXISTS public.food_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  location TEXT NOT NULL,
  donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL,
  donor_type TEXT NOT NULL CHECK (donor_type IN ('individual', 'restaurant', 'caterer')),
  food_type TEXT CHECK (food_type IN ('veg', 'non-veg')),
  food_image_url TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'pending_pickup',
    'pickup_assigned',
    'at_warehouse',
    'pending_delivery',
    'delivery_assigned',
    'delivered',
    'donated_to_animals'
  )),
  pickup_distance_km NUMERIC,
  eta_minutes INTEGER,
  quality_passed BOOLEAN,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Food requests table
CREATE TABLE IF NOT EXISTS public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_donation_id UUID REFERENCES public.food_donations(id) ON DELETE SET NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('self', 'third_party', 'ngo')),
  location TEXT NOT NULL,
  beneficiary_photo_url TEXT,
  delivery_proof_photo_url TEXT,
  delivery_distance_km NUMERIC,
  eta_minutes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'completed')),
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;
