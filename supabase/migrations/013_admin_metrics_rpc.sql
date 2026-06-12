create or replace function public.get_dau(today_start timestamptz)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(distinct user_id)::bigint
  from public.checkins
  where checked_in_at >= today_start
$$;
