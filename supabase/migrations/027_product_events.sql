-- Lightweight beta instrumentation table for tracking key product milestones
CREATE TABLE IF NOT EXISTS product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_name text NOT NULL,
  properties jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events" ON product_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events" ON product_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
