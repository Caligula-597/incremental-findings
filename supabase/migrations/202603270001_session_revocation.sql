-- P0-2: session state persistence for revocation and forced logout.

begin;

create table if not exists public.session_states (
  sid uuid primary key,
  user_id uuid not null,
  email text not null,
  name text not null,
  role text not null,
  editor_role text,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_session_states_user_id
  on public.session_states(user_id, created_at desc);

create index if not exists idx_session_states_email
  on public.session_states(email, created_at desc);

create index if not exists idx_session_states_active
  on public.session_states(revoked_at, expires_at);

create or replace function public.revoke_session(
  p_sid uuid,
  p_revoked_at timestamptz default now()
)
returns boolean
language sql
as $$
  with updated as (
    update public.session_states
    set revoked_at = coalesce(revoked_at, p_revoked_at),
        last_seen_at = p_revoked_at
    where sid = p_sid
      and revoked_at is null
    returning 1
  )
  select exists(select 1 from updated);
$$;

create or replace function public.revoke_user_sessions(
  p_user_id uuid,
  p_revoked_at timestamptz default now()
)
returns integer
language sql
as $$
  with updated as (
    update public.session_states
    set revoked_at = coalesce(revoked_at, p_revoked_at),
        last_seen_at = p_revoked_at
    where user_id = p_user_id
      and revoked_at is null
    returning 1
  )
  select count(*)::integer from updated;
$$;

create or replace function public.prune_expired_session_states(
  retention_days integer default 7
)
returns integer
language sql
as $$
  with deleted as (
    delete from public.session_states
    where expires_at < now() - make_interval(days => greatest(1, retention_days))
    returning 1
  )
  select count(*)::integer from deleted;
$$;

commit;
