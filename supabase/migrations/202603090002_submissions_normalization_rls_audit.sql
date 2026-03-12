-- Submissions normalization + RLS hardening + audit sync baseline.
-- This migration operationalizes the agreed direction:
-- 1) structured submission authors table
-- 2) submitter_email column on submissions
-- 3) stricter RLS policies for submissions/submission_files
-- 4) audit logging trigger for submission_files writes
-- 5) user-visible view for safe querying

begin;

-- 1) Normalize author records.
create table if not exists public.submission_authors (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_email text,
  author_name text not null,
  author_order int not null,
  created_at timestamptz default now()
);

create index if not exists idx_submission_authors_submission_id
  on public.submission_authors(submission_id);

create index if not exists idx_submission_authors_email
  on public.submission_authors(author_email);

-- 2) Add submitter_email for ownership/RLS checks.
alter table if exists public.submissions
  add column if not exists submitter_email text;

create index if not exists idx_submissions_submitter_email
  on public.submissions(submitter_email);

-- 3) RLS hardening for submissions + submission_files.
alter table if exists public.submissions enable row level security;
alter table if exists public.submission_files enable row level security;

-- Clean up broad/legacy policies where names are known.
drop policy if exists "Allow All Select" on public.submissions;
drop policy if exists "Allow All Insert" on public.submissions;
drop policy if exists "Allow All Update" on public.submissions;
drop policy if exists "Allow All Select" on public.submission_files;
drop policy if exists "Allow All Insert" on public.submission_files;
drop policy if exists "Allow All Update" on public.submission_files;

drop policy if exists "service_role_select_submissions" on public.submissions;
drop policy if exists "service_role_insert_submissions" on public.submissions;
drop policy if exists "service_role_update_submissions" on public.submissions;
drop policy if exists "service_role_select_submission_files" on public.submission_files;
drop policy if exists "service_role_insert_submission_files" on public.submission_files;
drop policy if exists "service_role_update_submission_files" on public.submission_files;
drop policy if exists "authenticated_select_own_submissions" on public.submissions;
drop policy if exists "authenticated_select_own_submission_files" on public.submission_files;

-- Service role full access for backend operations.
create policy "service_role_select_submissions"
  on public.submissions for select to service_role using (true);

create policy "service_role_insert_submissions"
  on public.submissions for insert to service_role with check (true);

create policy "service_role_update_submissions"
  on public.submissions for update to service_role using (true) with check (true);

create policy "service_role_select_submission_files"
  on public.submission_files for select to service_role using (true);

create policy "service_role_insert_submission_files"
  on public.submission_files for insert to service_role with check (true);

create policy "service_role_update_submission_files"
  on public.submission_files for update to service_role using (true) with check (true);

-- Authenticated read own submissions/files by JWT email claim.
create policy "authenticated_select_own_submissions"
  on public.submissions
  for select
  to authenticated
  using (
    submitter_email is not null
    and lower(submitter_email) = lower(coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'email'), ''))
  );

create policy "authenticated_select_own_submission_files"
  on public.submission_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.submissions s
      where s.id = submission_files.submission_id
        and s.submitter_email is not null
        and lower(s.submitter_email) = lower(coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'email'), ''))
    )
  );

-- 4) Audit + metadata sync trigger for submission_files insert/update.
create or replace function public.fn_audit_submission_file_change()
returns trigger
language plpgsql
as $$
begin
  -- Ensure metadata columns are present in row when omitted.
  if new.size_bytes is null then
    new.size_bytes := 0;
  end if;

  if new.content_type is null then
    new.content_type := 'application/octet-stream';
  end if;

  insert into public.audit_logs (id, submission_id, action, actor_email, detail, created_at)
  values (
    uuid_generate_v4(),
    new.submission_id,
    case when tg_op = 'INSERT' then 'submission_file_added' else 'submission_file_updated' end,
    null,
    concat('kind=', new.file_kind, '; path=', new.file_path, '; name=', new.file_name),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_submission_file_change on public.submission_files;

create trigger trg_audit_submission_file_change
before insert or update on public.submission_files
for each row execute function public.fn_audit_submission_file_change();

-- 5) Convenience view for user-visible submissions.
create or replace view public.vw_submissions_for_user as
select
  s.id,
  s.title,
  s.abstract,
  s.status,
  s.submitter_email,
  s.created_at,
  s.doi,
  s.discipline,
  s.topic,
  s.article_type
from public.submissions s
where s.submitter_email is not null
  and lower(s.submitter_email) = lower(coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'email'), ''));

commit;
