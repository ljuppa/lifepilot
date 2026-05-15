-- Prevent duplicate check-ins for the same user on the same UTC calendar day.
-- Uses a partial expression index so it works without a generated column.
create unique index checkins_user_day_unique
  on public.checkins (user_id, date(checked_in_at at time zone 'UTC'));
