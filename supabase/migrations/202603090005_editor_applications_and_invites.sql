-- P0/P1: editor application workflow + manual invite codes.

begin;

create table if not exists public.editor_applications (
  id uuid primary key,
  applicant_email text not null,
  applicant_name text not null,
  statement text not null,
  status text not null default 'pending',
  reviewed_by_email text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_editor_applications_email on public.editor_applications(applicant_email);
create index if not exists idx_editor_applications_status on public.editor_applications(status);
create index if not exists idx_editor_applications_created_at on public.editor_applications(created_at desc);

create table if not exists public.editor_invites (
  id uuid primary key,
  applicant_email text not null,
  invite_code text not null,
  invited_by_email text not null,
  application_id uuid references public.editor_applications(id) on delete set null,
  status text not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists idx_editor_invites_code on public.editor_invites(invite_code);
create index if not exists idx_editor_invites_email on public.editor_invites(applicant_email);
create index if not exists idx_editor_invites_status on public.editor_invites(status);
create index if not exists idx_editor_invites_expires_at on public.editor_invites(expires_at);

alter table if exists public.editor_applications enable row level security;
alter table if exists public.editor_invites enable row level security;

drop policy if exists "service_role_select_editor_applications" on public.editor_applications;
drop policy if exists "service_role_insert_editor_applications" on public.editor_applications;
drop policy if exists "service_role_update_editor_applications" on public.editor_applications;
drop policy if exists "service_role_select_editor_invites" on public.editor_invites;
drop policy if exists "service_role_insert_editor_invites" on public.editor_invites;
drop policy if exists "service_role_update_editor_invites" on public.editor_invites;

create policy "service_role_select_editor_applications"
  on public.editor_applications
  for select
  to service_role
  using (true);

create policy "service_role_insert_editor_applications"
  on public.editor_applications
  for insert
  to service_role
  with check (true);

create policy "service_role_update_editor_applications"
  on public.editor_applications
  for update
  to service_role
  using (true)
  with check (true);

create policy "service_role_select_editor_invites"
  on public.editor_invites
  for select
  to service_role
  using (true);

create policy "service_role_insert_editor_invites"
  on public.editor_invites
  for insert
  to service_role
  with check (true);

create policy "service_role_update_editor_invites"
  on public.editor_invites
  for update
  to service_role
  using (true)
  with check (true);

commit;
