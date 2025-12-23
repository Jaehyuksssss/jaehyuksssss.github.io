-- Omok (오목) leaderboard schema & RPCs
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- scores table
create table if not exists public.omok_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 2 and 16),
  sig text not null unique,
  best_streak integer not null check (best_streak >= 0),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists omok_scores_order_idx on public.omok_scores (best_streak desc, updated_at asc);

alter table public.omok_scores enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'omok_scores' and policyname = 'omok_scores_read') then
    create policy "omok_scores_read" on public.omok_scores for select using (true);
  end if;
end $$;

-- hash helper (nickname + last4 + optional pepper)
create or replace function public.omok_hash_sig(p_nickname text, p_last4 text)
returns text
language sql
stable
as $$
  select encode(
    digest(lower(trim(p_nickname)) || ':' || trim(p_last4) || ':' || coalesce(current_setting('app.omok_pepper', true), ''), 'sha256')
  , 'hex');
$$;
grant execute on function public.omok_hash_sig(text, text) to anon, authenticated;

-- submit score (keep maximum streak only)
create or replace function public.omok_submit_score(
  p_nickname  text,
  p_last4     text,
  p_streak    integer
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_sig text;
  v_name text;
begin
  if p_nickname is null or char_length(trim(p_nickname)) < 2 or char_length(trim(p_nickname)) > 16 then
    raise exception 'invalid nickname';
  end if;
  if p_last4 is null or p_last4 !~ '^[0-9]{4}$' then
    raise exception 'invalid last4';
  end if;
  if p_streak is null or p_streak < 0 or p_streak > 10000 then
    raise exception 'invalid streak';
  end if;

  v_name := trim(p_nickname);
  v_sig := public.omok_hash_sig(v_name, p_last4);

  insert into public.omok_scores as t (nickname, sig, best_streak, attempts)
  values (v_name, v_sig, p_streak, 1)
  on conflict (sig) do update
    set nickname = excluded.nickname,
        best_streak = greatest(t.best_streak, excluded.best_streak),
        attempts = t.attempts + 1,
        updated_at = now();
end;
$$;
revoke all on function public.omok_submit_score(text, text, integer) from public;
grant execute on function public.omok_submit_score(text, text, integer) to anon, authenticated;

-- Leaderboard RPC
create or replace function public.omok_top_scores(p_limit int default 100)
returns table (
  rank integer,
  nickname text,
  best_streak integer,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (order by best_streak desc, updated_at asc) as rank,
    nickname,
    best_streak,
    updated_at
  from public.omok_scores
  order by best_streak desc, updated_at asc
  limit greatest(1, coalesce(p_limit, 100));
$$;
grant execute on function public.omok_top_scores(int) to anon, authenticated;

-- Optional: server-side pepper
-- alter database postgres set app.omok_pepper = 'change-this-to-a-random-secret';

