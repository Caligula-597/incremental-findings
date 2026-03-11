-- P1: publication ethics case management baseline + indexes.

begin;

create table if not exists public.ethics_cases (
  id uuid primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  case_type text not null,
  status text not null,
  summary text not null,
  reporter_email text not null,
  owner_email text,
  resolution_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ethics_cases_submission_id on public.ethics_cases(submission_id);
create index if not exists idx_ethics_cases_status on public.ethics_cases(status);
create index if not exists idx_ethics_cases_created_at on public.ethics_cases(created_at desc);

alter table if exists public.ethics_cases enable row level security;

drop policy if exists "service_role_select_ethics_cases" on public.ethics_cases;
drop policy if exists "service_role_insert_ethics_cases" on public.ethics_cases;
drop policy if exists "service_role_update_ethics_cases" on public.ethics_cases;

create policy "service_role_select_ethics_cases"
  on public.ethics_cases
  for select
  to service_role
  using (true);

create policy "service_role_insert_ethics_cases"
  on public.ethics_cases
  for insert
  to service_role
  with check (true);

create policy "service_role_update_ethics_cases"
  on public.ethics_cases
  for update
  to service_role
  using (true)
  with check (true);

commit;
