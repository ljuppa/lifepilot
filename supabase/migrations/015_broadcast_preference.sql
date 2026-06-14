-- Add broadcastEmails to notification_preferences default and backfill existing rows
ALTER TABLE public.profiles
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"briefingEmails": true, "reengagementEmails": true, "broadcastEmails": true}'::jsonb;

UPDATE public.profiles
  SET notification_preferences = notification_preferences || '{"broadcastEmails": true}'::jsonb
WHERE notification_preferences->>'broadcastEmails' IS NULL;
