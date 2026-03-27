-- P0-1: distributed rate limit buckets + atomic consume function.

begin;

create table if not exists public.rate_limit_buckets (
  bucket text primary key,
  count integer not null,
  window_start timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_buckets_updated_at
  on public.rate_limit_buckets(updated_at desc);

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_max_requests integer,
  p_window_ms integer
)
returns table(
  allowed boolean,
  limit_value integer,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
as $$
declare
  now_ts timestamptz := clock_timestamp();
  window_seconds numeric := greatest(1, p_window_ms)::numeric / 1000;
  window_interval interval := (window_seconds || ' seconds')::interval;
  row_record public.rate_limit_buckets%rowtype;
  next_count integer;
  retry_seconds integer;
begin
  if p_bucket is null or btrim(p_bucket) = '' then
    raise exception 'p_bucket is required';
  end if;

  if p_max_requests <= 0 then
    raise exception 'p_max_requests must be > 0';
  end if;

  loop
    select *
    into row_record
    from public.rate_limit_buckets
    where bucket = p_bucket
    for update;

    if found then
      if now_ts - row_record.window_start >= window_interval then
        update public.rate_limit_buckets
        set count = 1,
            window_start = now_ts,
            updated_at = now_ts
        where bucket = p_bucket;

        return query select true, p_max_requests, greatest(0, p_max_requests - 1), 0;
        return;
      end if;

      next_count := row_record.count + 1;

      update public.rate_limit_buckets
      set count = next_count,
          updated_at = now_ts
      where bucket = p_bucket;

      retry_seconds := greatest(1, ceil(extract(epoch from ((row_record.window_start + window_interval) - now_ts)))::integer);

      return query
      select
        (next_count <= p_max_requests),
        p_max_requests,
        greatest(0, p_max_requests - next_count),
        case when next_count <= p_max_requests then 0 else retry_seconds end;
      return;
    end if;

    begin
      insert into public.rate_limit_buckets (bucket, count, window_start, updated_at)
      values (p_bucket, 1, now_ts, now_ts);

      return query select true, p_max_requests, greatest(0, p_max_requests - 1), 0;
      return;
    exception when unique_violation then
      -- concurrent insert won the race; retry loop and lock row.
    end;
  end loop;
end;
$$;

create or replace function public.prune_rate_limit_buckets(retention_minutes integer default 120)
returns integer
language sql
as $$
  with deleted as (
    delete from public.rate_limit_buckets
    where updated_at < now() - make_interval(mins => greatest(1, retention_minutes))
    returning 1
  )
  select count(*)::integer from deleted;
$$;

commit;
