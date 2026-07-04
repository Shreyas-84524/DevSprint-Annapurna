-- Initialize Database Schema for Annapurna Foundation v2.0

-- Create users table (synchronized with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('donor', 'restaurant', 'caterer', 'ngo', 'volunteer')),
  earnings NUMERIC DEFAULT 0,
  upi_id TEXT,
  aadhaar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create monetary_donations table
CREATE TABLE IF NOT EXISTS public.monetary_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create food_donations table
CREATE TABLE IF NOT EXISTS public.food_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  location TEXT NOT NULL,
  donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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
  volunteer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create food_requests table
CREATE TABLE IF NOT EXISTS public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_donation_id UUID REFERENCES public.food_donations(id) ON DELETE SET NULL,
  requester_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('self', 'third_party', 'ngo')),
  location TEXT NOT NULL,
  beneficiary_photo_url TEXT,
  delivery_proof_photo_url TEXT,
  delivery_distance_km NUMERIC,
  eta_minutes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'completed')),
  volunteer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetary_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;
