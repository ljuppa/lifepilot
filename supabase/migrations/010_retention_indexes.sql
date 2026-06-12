-- Standalone index on checked_in_at for efficient cross-user retention cleanup.
-- The retentionCleanup job deletes checkins where checked_in_at < (now - 12 months)
-- across ALL users (no user_id predicate), so the composite idx_checkins_user_id_date
-- from 004_checkins.sql is not usable here. A standalone index prevents a full table scan.
-- briefings(briefing_date) is already indexed by idx_briefings_briefing_date in 006_briefings.sql.
create index if not exists idx_checkins_checked_in_at
  on public.checkins (checked_in_at);
