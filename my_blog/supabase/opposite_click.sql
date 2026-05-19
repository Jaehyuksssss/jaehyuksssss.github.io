-- Opposite Click (반대로 클릭하기) leaderboard schema & RPCs
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- scores table
create table if not exists public.oc_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 2 and 16),
  sig text not null unique,
  best_score integer not null check (best_score >= 0),
  best_rounds integer not null check (best_rounds >= 0),
  best_streak integer not null check (best_streak >= 0),
  best_reaction_ms integer check (best_reaction_ms >= 0),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oc_scores_order_idx
  on public.oc_scores (best_score desc, best_rounds desc, best_streak desc, best_reaction_ms asc nulls last, updated_at asc);

alter table public.oc_scores enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'oc_scores' and policyname = 'oc_scores_read'
  ) then
    create policy "oc_scores_read" on public.oc_scores for select using (true);
  end if;
end $$;

-- hash helper (nickname + last4 + optional pepper)
create or replace function public.oc_hash_sig(p_nickname text, p_last4 text)
returns text
language sql
stable
as $$
  select encode(
    digest(lower(trim(p_nickname)) || ':' || trim(p_last4) || ':' || coalesce(current_setting('app.oc_pepper', true), ''), 'sha256')
  , 'hex');
$$;
grant execute on function public.oc_hash_sig(text, text) to anon, authenticated;

-- submit score (keep maximums; lower reaction time is better)
create or replace function public.oc_submit_score(
  p_nickname   text,
  p_last4      text,
  p_score      integer,
  p_rounds     integer,
  p_streak     integer,
  p_reaction_ms integer default null
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
  if p_score is null or p_score < 0 or p_score > 1000000 then
    raise exception 'invalid score';
  end if;
  if p_rounds is null or p_rounds < 0 or p_rounds > 5000 then
    raise exception 'invalid rounds';
  end if;
  if p_streak is null or p_streak < 0 or p_streak > 5000 then
    raise exception 'invalid streak';
  end if;
  if p_reaction_ms is not null and (p_reaction_ms < 0 or p_reaction_ms > 60000) then
    raise exception 'invalid reaction_ms';
  end if;

  v_name := trim(p_nickname);
  v_sig := public.oc_hash_sig(v_name, p_last4);

  insert into public.oc_scores as t (nickname, sig, best_score, best_rounds, best_streak, best_reaction_ms, attempts)
  values (v_name, v_sig, p_score, p_rounds, p_streak, p_reaction_ms, 1)
  on conflict (sig) do update
    set nickname = excluded.nickname,
        best_score = greatest(t.best_score, excluded.best_score),
        best_rounds = greatest(t.best_rounds, excluded.best_rounds),
        best_streak = greatest(t.best_streak, excluded.best_streak),
        best_reaction_ms = case
          when excluded.best_reaction_ms is null then t.best_reaction_ms
          when t.best_reaction_ms is null then excluded.best_reaction_ms
          else least(t.best_reaction_ms, excluded.best_reaction_ms)
        end,
        attempts = t.attempts + 1,
        updated_at = now();
end;
$$;
revoke all on function public.oc_submit_score(text, text, integer, integer, integer, integer) from public;
grant execute on function public.oc_submit_score(text, text, integer, integer, integer, integer) to anon, authenticated;

-- leaderboard
create or replace function public.oc_top_scores(p_limit int default 100)
returns table (
  rank integer,
  nickname text,
  best_score integer,
  best_rounds integer,
  best_streak integer,
  best_reaction_ms integer,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (order by best_score desc, best_rounds desc, best_streak desc, best_reaction_ms asc nulls last, updated_at asc) as rank,
    nickname, best_score, best_rounds, best_streak, best_reaction_ms, updated_at
  from public.oc_scores
  order by best_score desc, best_rounds desc, best_streak desc, best_reaction_ms asc nulls last, updated_at asc
  limit greatest(1, coalesce(p_limit, 100));
$$;
grant execute on function public.oc_top_scores(int) to anon, authenticated;

-- Optional pepper for stable hashing
-- alter database postgres set app.oc_pepper = 'change-this-to-a-secret';
