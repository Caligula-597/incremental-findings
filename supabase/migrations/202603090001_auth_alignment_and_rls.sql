-- Auth contract alignment + strict RLS baseline for account identity tables.
-- Applies product decisions:
-- 1) Keep optional username on user_accounts.
-- 2) Use service_role-only writes for user_accounts/orcid_links.

begin;

alter table if exists public.user_accounts
  add column if not exists username text;

create unique index if not exists user_accounts_username_key
  on public.user_accounts (username)
  where username is not null;

alter table if exists public.orcid_links
  add column if not exists user_id uuid;

-- Add FK only once.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orcid_links_user_id_fkey'
      and conrelid = 'public.orcid_links'::regclass
  ) then
    alter table public.orcid_links
      add constraint orcid_links_user_id_fkey
      foreign key (user_id) references public.user_accounts(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_orcid_links_user_id
  on public.orcid_links(user_id);

alter table if exists public.user_accounts enable row level security;
alter table if exists public.orcid_links enable row level security;

-- Remove previously broad policies if present.
drop policy if exists "Allow All Insert" on public.user_accounts;
drop policy if exists "Allow system to insert accounts" on public.user_accounts;
drop policy if exists "Allow All Insert" on public.orcid_links;
drop policy if exists "Allow system to insert orcid links" on public.orcid_links;

-- Minimal-privilege: only service_role can insert/update identity bindings.
create policy "service_role_insert_user_accounts"
  on public.user_accounts
  for insert
  to service_role
  with check (true);

create policy "service_role_update_user_accounts"
  on public.user_accounts
  for update
  to service_role
  using (true)
  with check (true);

create policy "service_role_insert_orcid_links"
  on public.orcid_links
  for insert
  to service_role
  with check (true);

create policy "service_role_update_orcid_links"
  on public.orcid_links
  for update
  to service_role
  using (true)
  with check (true);

commit;
