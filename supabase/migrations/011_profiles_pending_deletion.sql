-- Soft-flag for accounts that entered a partial deletion state:
-- all app data rows deleted but auth.admin.deleteUser() failed.
-- When true the /data page shows a "deletion pending" banner and
-- DataActions offers a retry. Cleared implicitly when deleteUser succeeds
-- (the profile row is cascade-deleted at that point).
alter table public.profiles
  add column if not exists pending_deletion boolean not null default false;
