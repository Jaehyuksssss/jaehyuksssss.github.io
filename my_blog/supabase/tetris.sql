-- 테트리스 marathon-v1. Run once in the project's Supabase SQL editor.
-- All writes and reads go through the Edge Function. No anon table access.
begin;
create table if not exists public.tetris_runs (
  id uuid primary key default gen_random_uuid(),
  player_hash text not null,
  seed bigint not null check (seed between 1 and 4294967295),
  ruleset text not null default 'marathon-v1',
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists tetris_runs_player_created on public.tetris_runs(player_hash, created_at desc);
create table if not exists public.tetris_scores (
  player_hash text primary key,
  nickname text not null check (char_length(nickname) between 2 and 16),
  score integer not null check (score >= 0),
  lines integer not null check (lines >= 0),
  level integer not null check (level >= 1),
  ticks integer not null check (ticks between 1 and 432000),
  input_method text not null check (input_method in ('keyboard','touch')),
  achieved_at timestamptz not null default now()
);
create index if not exists tetris_score_order on public.tetris_scores(score desc, achieved_at, player_hash);
alter table public.tetris_runs enable row level security;
alter table public.tetris_scores enable row level security;
revoke all on public.tetris_runs, public.tetris_scores from anon, authenticated;
grant all on public.tetris_runs, public.tetris_scores to service_role;

create or replace function public.tetris_start(p_player_hash text, p_seed bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_player_hash, 0));
  if (select count(*) from public.tetris_runs where player_hash = p_player_hash and created_at > now() - interval '1 minute') >= 12 then
    raise exception 'Too many starts';
  end if;
  insert into public.tetris_runs(player_hash, seed) values (p_player_hash, p_seed)
  returning jsonb_build_object('id',id,'seed',seed) into result;
  return result;
end $$;

create or replace function public.tetris_board(p_player_hash text)
returns jsonb language sql security definer set search_path = '' as $$
  with ranked as (
    select row_number() over(order by score desc, achieved_at asc, player_hash asc) as rank,
           nickname, score, lines, level, player_hash = p_player_hash as own
    from public.tetris_scores
  ), mine as (select * from ranked where own)
  select jsonb_build_object(
    'top',coalesce((select jsonb_agg(to_jsonb(t) order by rank) from (select * from ranked where rank <= 10) t),'[]'::jsonb),
    'me',(select to_jsonb(mine) from mine),
    'next_score',(select score from ranked where rank = (select rank - 1 from mine))
  );
$$;

-- Called ONLY after deterministic replay validation in the Edge Function.
create or replace function public.tetris_commit(
  p_run_id uuid, p_player_hash text, p_nickname text,
  p_score integer, p_lines integer, p_level integer, p_ticks integer, p_input text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare run public.tetris_runs;
begin
  select * into run from public.tetris_runs where id = p_run_id and player_hash = p_player_hash for update;
  if not found then raise exception 'Unknown run'; end if;
  if run.submitted_at is not null then return public.tetris_board(p_player_hash); end if;
  if run.created_at < now() - interval '24 hours' then raise exception 'Expired run'; end if;
  insert into public.tetris_scores(player_hash,nickname,score,lines,level,ticks,input_method)
  values(p_player_hash,p_nickname,p_score,p_lines,p_level,p_ticks,p_input)
  on conflict (player_hash) do update set
    nickname = excluded.nickname, score = excluded.score, lines = excluded.lines,
    level = excluded.level, ticks = excluded.ticks, input_method = excluded.input_method, achieved_at = now()
  where excluded.score > public.tetris_scores.score;
  update public.tetris_runs set submitted_at = now() where id = p_run_id;
  return public.tetris_board(p_player_hash);
end $$;
revoke all on function public.tetris_start(text,bigint) from public, anon, authenticated;
revoke all on function public.tetris_board(text) from public, anon, authenticated;
revoke all on function public.tetris_commit(uuid,text,text,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.tetris_start(text,bigint) to service_role;
grant execute on function public.tetris_board(text) to service_role;
grant execute on function public.tetris_commit(uuid,text,text,integer,integer,integer,integer,text) to service_role;
commit;

-- Optional maintenance (e.g. daily in Supabase Cron):
-- delete from public.tetris_runs where created_at < now() - interval '2 days';
