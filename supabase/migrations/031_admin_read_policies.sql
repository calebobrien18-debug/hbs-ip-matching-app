-- Allow admins to read all product_events (currently restricted to own rows only)
CREATE POLICY "Admins read all events" ON product_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Allow admins to read all hbs_ip profiles (currently restricted to own row only)
CREATE POLICY "Admins read all profiles" ON hbs_ip
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
