-- Ball Slice (떨어지는 공 베기) leaderboard schema & RPCs
create extension if not exists pgcrypto;

-- scores table
create table if not exists public.bs_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 2 and 16),
  sig text not null unique,
  best_score integer not null check (best_score >= 0),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bs_scores_order_idx on public.bs_scores (best_score desc, updated_at asc);

alter table public.bs_scores enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bs_scores' and policyname = 'bs_scores_read') then
    create policy "bs_scores_read" on public.bs_scores for select using (true);
  end if;
end $$;

-- hash helper (nickname + last4 + optional pepper)
create or replace function public.bs_hash_sig(p_nickname text, p_last4 text)
returns text
language sql
stable
as $$
  select encode(
    digest(lower(trim(p_nickname)) || ':' || trim(p_last4) || ':' || coalesce(current_setting('app.bs_pepper', true), ''), 'sha256')
  , 'hex');
$$;
grant execute on function public.bs_hash_sig(text, text) to anon, authenticated;

-- submit score (keep maximum only)
create or replace function public.bs_submit_score(
  p_nickname  text,
  p_last4     text,
  p_score     integer,
  p_client_id text default null
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

  v_name := trim(p_nickname);
  v_sig := public.bs_hash_sig(v_name, p_last4);

  insert into public.bs_scores as t (nickname, sig, best_score, attempts)
  values (v_name, v_sig, p_score, 1)
  on conflict (sig) do update
    set nickname = excluded.nickname,
        best_score = greatest(t.best_score, excluded.best_score),
        attempts = t.attempts + 1,
        updated_at = now();
end;
$$;
revoke all on function public.bs_submit_score(text, text, integer, text) from public;
grant execute on function public.bs_submit_score(text, text, integer, text) to anon, authenticated;

-- top scores
create or replace function public.bs_top_scores(p_limit int default 20)
returns table (
  rank integer,
  nickname text,
  best_score integer,
  updated_at timestamptz
)
language sql
stable
as $$
  select row_number() over (order by best_score desc, updated_at asc) as rank,
         nickname,
         best_score,
         updated_at
    from public.bs_scores
   order by best_score desc, updated_at asc
   limit greatest(1, coalesce(p_limit, 20));
$$;
grant execute on function public.bs_top_scores(int) to anon, authenticated;

-- Optional pepper for stable hashing
-- alter database postgres set app.bs_pepper = 'change-this-to-a-secret';

