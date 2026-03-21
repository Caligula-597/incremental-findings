create table if not exists public.email_verifications (
  email text primary key,
  user_id uuid references public.user_accounts(id) on delete set null,
  code_hash text not null,
  expires_at timestamptz not null,
  sent_at timestamptz not null,
  verified_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_verifications_user_id on public.email_verifications(user_id);
create index if not exists idx_email_verifications_verified_at on public.email_verifications(verified_at);
