-- Setup triggers to sync auth.users to public.users and define RLS policies

-- Alter monetary_donations to add donor_id for better security mapping
ALTER TABLE public.monetary_donations 
ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role, upi_id, aadhaar, earnings)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'donor'),
    new.raw_user_meta_data->>'upi_id',
    new.raw_user_meta_data->>'aadhaar',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Define RLS Policies

-- 1. Users policies
CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (true); -- Allow select for all authenticated users to see volunteers, restaurants, etc.

CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Monetary Donations policies
CREATE POLICY "Donors can view their own monetary donations"
  ON public.monetary_donations FOR SELECT
  USING (auth.uid() = donor_id);

CREATE POLICY "Anyone can insert monetary donations"
  ON public.monetary_donations FOR INSERT
  WITH CHECK (true);

-- 3. Food Donations policies
CREATE POLICY "Anyone can view food donations"
  ON public.food_donations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create food donations"
  ON public.food_donations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Donors or assigned volunteers can update food donations"
  ON public.food_donations FOR UPDATE
  USING (
    auth.uid() = donor_id OR 
    auth.uid() = volunteer_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'volunteer'
    )
  );

-- 4. Food Requests policies
CREATE POLICY "Anyone can view food requests"
  ON public.food_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create food requests"
  ON public.food_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Requesters or assigned volunteers can update food requests"
  ON public.food_requests FOR UPDATE
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = volunteer_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'volunteer'
    )
  );
