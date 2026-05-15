create table if not exists public.briefings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  content               jsonb not null,
  briefing_date         date not null,
  email_status          text not null default 'pending'
                          check (email_status in ('pending', 'delivered', 'failed', 'skipped_preference')),
  safety_filter_triggered bool not null default false,
  helpful               bool,
  created_at            timestamptz not null default now()
);

alter table public.briefings enable row level security;

create policy "Users access own briefings"
  on public.briefings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- One briefing per user per calendar day
create unique index briefings_user_date_unique
  on public.briefings (user_id, briefing_date);

create index idx_briefings_user_id
  on public.briefings (user_id);

create index idx_briefings_user_id_date
  on public.briefings (user_id, briefing_date desc);

-- Retention cleanup uses this to efficiently delete old briefings
create index idx_briefings_briefing_date
  on public.briefings (briefing_date);
