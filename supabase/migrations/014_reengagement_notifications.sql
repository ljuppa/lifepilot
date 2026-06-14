create table if not exists public.reengagement_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  email_status text not null check (email_status in ('delivered', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_reengagement_notifications_user_id_sent_at
  on public.reengagement_notifications(user_id, sent_at desc);

alter table public.reengagement_notifications enable row level security;

-- P2 patch: grant all DML operations so checkInactivity.ts and other server code can write rows
grant select, insert, update, delete on public.reengagement_notifications to service_role;
