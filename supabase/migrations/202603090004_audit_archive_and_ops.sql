-- P2: audit archive table + archival function for retention policy.

begin;

create table if not exists public.audit_logs_archive (
  id uuid primary key,
  submission_id uuid,
  action text not null,
  actor_email text,
  detail text,
  created_at timestamptz not null,
  archived_at timestamptz default now()
);

create index if not exists idx_audit_logs_archive_created_at
  on public.audit_logs_archive(created_at desc);

create index if not exists idx_audit_logs_archive_archived_at
  on public.audit_logs_archive(archived_at desc);

create or replace function public.archive_audit_logs(retention_days int default 90)
returns int
language plpgsql
as $$
declare
  moved_count int;
begin
  insert into public.audit_logs_archive (id, submission_id, action, actor_email, detail, created_at, archived_at)
  select a.id, a.submission_id, a.action, a.actor_email, a.detail, a.created_at, now()
  from public.audit_logs a
  where a.created_at < now() - make_interval(days => retention_days)
    and not exists (select 1 from public.audit_logs_archive ar where ar.id = a.id);

  get diagnostics moved_count = row_count;

  delete from public.audit_logs
  where created_at < now() - make_interval(days => retention_days);

  return moved_count;
end;
$$;

commit;
