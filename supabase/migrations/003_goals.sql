-- Goals: 1–3 active goals per user across health / finance / wellness domains
CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL CHECK (domain IN ('health', 'finance', 'wellness')),
  title        TEXT NOT NULL,
  target_value NUMERIC,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals (user_id, status);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own goals"
  ON goals FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE USING (user_id = auth.uid());
