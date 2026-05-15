create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mood            smallint not null check (mood between 1 and 5),
  health_metric   numeric,
  finance_metric  numeric,
  wellness_metric numeric,
  note            text check (char_length(note) <= 80),
  checked_in_at   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table public.checkins enable row level security;

create policy "Users manage own checkins"
  on public.checkins
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_checkins_user_id       on public.checkins (user_id);
create index idx_checkins_user_id_date  on public.checkins (user_id, checked_in_at desc);
