-- Profile: one row per user, created during onboarding wizard
CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  age                     INTEGER NOT NULL CHECK (age >= 18),
  gender                  TEXT,
  height                  NUMERIC,
  weight                  NUMERIC,
  location                TEXT,
  monthly_income          NUMERIC,
  fixed_expenses          NUMERIC,
  discretionary_budget    NUMERIC,
  briefing_time           TEXT NOT NULL DEFAULT '07:00',
  timezone                TEXT NOT NULL DEFAULT 'UTC',
  notification_preferences JSONB NOT NULL DEFAULT '{"briefingEmails": true, "reengagementEmails": true}',
  last_reengagement_sent_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE USING (id = auth.uid());
