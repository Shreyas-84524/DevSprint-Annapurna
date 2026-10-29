-- Project Annapurna RLS Baseline Policies
-- Safe initial RLS configuration without editable metadata role escalation

-- 1. Food Donations policies
CREATE POLICY "Anyone can view food donations"
  ON public.food_donations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create food donations"
  ON public.food_donations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Donors or assigned volunteers can update food donations"
  ON public.food_donations FOR UPDATE
  USING (
    auth.uid() = donor_id OR
    auth.uid() = volunteer_id
  );

-- 2. Food Requests policies
CREATE POLICY "Anyone can view food requests"
  ON public.food_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create food requests"
  ON public.food_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Requesters or assigned volunteers can update food requests"
  ON public.food_requests FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = volunteer_id
  );
