-- Time Match (시간 맞추기) schema & RPCs
-- Run this in Supabase SQL editor

-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) Table
create table if not exists public.tm_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 16),
  sig text not null unique,
  best_avg_ms integer not null check (best_avg_ms >= 0),
  best_single_ms integer not null check (best_single_ms >= 0),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful index for ordering
create index if not exists tm_scores_order_idx
  on public.tm_scores (best_avg_ms asc, best_single_ms asc, updated_at asc);

-- 3) RLS
alter table public.tm_scores enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tm_scores' and policyname = 'tm_scores_read'
  ) then
    create policy "tm_scores_read" on public.tm_scores for select using (true);
  end if;
end $$;

-- 4) Helper: stable hash with optional pepper from GUC app.tm_pepper
create or replace function public.tm_hash_sig(p_nickname text, p_last4 text)
returns text
language sql
stable
as $$
  select encode(
    digest( lower(trim(p_nickname)) || ':' || trim(p_last4) || ':' || coalesce(current_setting('app.tm_pepper', true), ''), 'sha256')
  , 'hex');
$$;
grant execute on function public.tm_hash_sig(text, text) to anon, authenticated;

-- 5) Upsert RPC (SECURITY DEFINER)
create or replace function public.tm_submit_score(
  p_nickname   text,
  p_last4      text,
  p_avg_ms     integer,
  p_single_ms  integer,
  p_client_id  text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_sig text;
  v_nickname text;
begin
  -- Basic validations
  if p_nickname is null or char_length(trim(p_nickname)) < 2 or char_length(trim(p_nickname)) > 16 then
    raise exception 'invalid nickname';
  end if;
  if p_last4 is null or p_last4 !~ '^\\d{4}$' then
    raise exception 'invalid last4';
  end if;
  if p_avg_ms is null or p_avg_ms < 0 or p_avg_ms > 60000 then
    raise exception 'invalid avg';
  end if;
  if p_single_ms is null or p_single_ms < 0 or p_single_ms > 60000 then
    raise exception 'invalid single';
  end if;

  v_nickname := trim(p_nickname);
  v_sig := public.tm_hash_sig(v_nickname, p_last4);

  insert into public.tm_scores as t
    (nickname, sig, best_avg_ms, best_single_ms, attempts)
  values
    (v_nickname, v_sig, p_avg_ms, p_single_ms, 1)
  on conflict (sig) do update
    set nickname = excluded.nickname,
        best_avg_ms = least(t.best_avg_ms, excluded.best_avg_ms),
        best_single_ms = least(t.best_single_ms, excluded.best_single_ms),
        attempts = t.attempts + 1,
        updated_at = now();
end;
$$;
revoke all on function public.tm_submit_score(text, text, integer, integer, text) from public;
grant execute on function public.tm_submit_score(text, text, integer, integer, text) to anon, authenticated;

-- 6) Leaderboard RPC
create or replace function public.tm_top_scores(p_limit int default 100)
returns table (
  rank integer,
  nickname text,
  best_avg_ms integer,
  best_single_ms integer,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (order by best_avg_ms asc, best_single_ms asc, updated_at asc) as rank,
    nickname,
    best_avg_ms,
    best_single_ms,
    updated_at
  from public.tm_scores
  order by best_avg_ms asc, best_single_ms asc, updated_at asc
  limit greatest(1, coalesce(p_limit, 100));
$$;
grant execute on function public.tm_top_scores(int) to anon, authenticated;

-- (Optional) set a server-side pepper (run once; adjust DB name if needed)
-- alter database postgres set app.tm_pepper = 'change-this-to-a-random-secret';

