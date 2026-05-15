-- Guard migration: ensures columns exist in environments where 002_profiles.sql
-- was applied before these columns were added.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_reengagement_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL
    DEFAULT '{"reengagementEmails": true, "briefingEmails": true}'::jsonb;
