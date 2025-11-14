-- Micro Storm (태풍 피하기) schema & RPCs
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- Scores table
create table if not exists public.ms_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 16),
  sig text not null unique,
  best_score integer not null check (best_score >= 0),
  best_survive_ms integer not null check (best_survive_ms >= 0),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ms_scores_order_idx
  on public.ms_scores (best_score desc, best_survive_ms desc, updated_at asc);

alter table public.ms_scores enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ms_scores' and policyname = 'ms_scores_read'
  ) then
    create policy "ms_scores_read" on public.ms_scores for select using (true);
  end if;
end $$;

-- Stable hash (with optional server-side pepper at app.ms_pepper)
create or replace function public.ms_hash_sig(p_nickname text, p_last4 text)
returns text
language sql
stable
as $$
  select encode(
    digest(lower(trim(p_nickname)) || ':' || trim(p_last4) || ':' || coalesce(current_setting('app.ms_pepper', true), ''), 'sha256')
  , 'hex');
$$;
grant execute on function public.ms_hash_sig(text, text) to anon, authenticated;

-- Upsert RPC
create or replace function public.ms_submit_score(
  p_nickname   text,
  p_last4      text,
  p_score      integer,
  p_survive_ms integer
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
  if p_nickname is null or char_length(trim(p_nickname)) < 2 or char_length(trim(p_nickname)) > 16 then
    raise exception 'invalid nickname';
  end if;
  if p_last4 is null or p_last4 !~ '^[0-9]{4}$' then
    raise exception 'invalid last4';
  end if;
  if p_score is null or p_score < 0 or p_score > 500000 then
    raise exception 'invalid score';
  end if;
  if p_survive_ms is null or p_survive_ms < 0 or p_survive_ms > 3600000 then
    raise exception 'invalid survive_ms';
  end if;

  v_nickname := trim(p_nickname);
  v_sig := public.ms_hash_sig(v_nickname, p_last4);

  insert into public.ms_scores as t (nickname, sig, best_score, best_survive_ms, attempts)
  values (v_nickname, v_sig, p_score, p_survive_ms, 1)
  on conflict (sig) do update
    set nickname = excluded.nickname,
        best_score = greatest(t.best_score, excluded.best_score),
        best_survive_ms = greatest(t.best_survive_ms, excluded.best_survive_ms),
        attempts = t.attempts + 1,
        updated_at = now();
end;
$$;
revoke all on function public.ms_submit_score(text, text, integer, integer) from public;
grant execute on function public.ms_submit_score(text, text, integer, integer) to anon, authenticated;

-- Leaderboard RPC
create or replace function public.ms_top_scores(p_limit int default 100)
returns table (
  rank integer,
  nickname text,
  best_score integer,
  best_survive_ms integer,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (order by best_score desc, best_survive_ms desc, updated_at asc) as rank,
    nickname,
    best_score,
    best_survive_ms,
    updated_at
  from public.ms_scores
  order by best_score desc, best_survive_ms desc, updated_at asc
  limit greatest(1, coalesce(p_limit, 100));
$$;
grant execute on function public.ms_top_scores(int) to anon, authenticated;

-- Optional: server-side pepper
-- alter database postgres set app.ms_pepper = 'change-this-to-a-random-secret';

