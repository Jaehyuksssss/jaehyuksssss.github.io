-- Reaction game session logging
-- Run this in Supabase SQL editor (or via migrations) to create
-- the table, RLS policies, and RPC functions used by the site.

-- Extensions needed for helpers
create extension if not exists pgcrypto;

-- Main event table: one row per event (start/end)
create table if not exists public.reaction_sessions (
  id               bigint generated always as identity primary key,
  -- App/session identity (client-generated; not guaranteed to be UUID)
  session_id       text not null,
  client_id        text,
  event            text not null check (event in ('start','end')),
  difficulty       text not null check (difficulty in ('easy','medium','hard')),

  -- Only present for end events
  rounds           integer,
  avg_ms           integer,
  hits             integer,
  times_ms         double precision[],

  -- Config
  time_limit_sec   integer,
  initial_grid     integer,

  -- Client context
  started_at_ms    bigint,
  ended_at_ms      bigint,
  user_agent       text,
  path             text,

  created_at       timestamptz not null default now()
);

-- Helpful indexes
create index if not exists reaction_sessions_session_id_idx on public.reaction_sessions (session_id);
create index if not exists reaction_sessions_created_at_idx on public.reaction_sessions (created_at);
create index if not exists reaction_sessions_event_idx on public.reaction_sessions (event);

-- Enable row level security. We will use SECURITY DEFINER RPCs,
-- so no broad table-level insert policy is needed.
alter table public.reaction_sessions enable row level security;

-- Cleanup any overloaded variants so only one RPC per name remains.
do $$
declare
  sig text;
begin
  -- Start RPC variants
  for sig in
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'log_reaction_start'
  loop
    if sig <> 'text, text, text, integer, integer, text, text' then
      execute format('drop function if exists public.log_reaction_start(%s);', sig);
    end if;
  end loop;

  -- End RPC variants
  for sig in
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'log_reaction_end'
  loop
    if sig <> 'text, text, text, integer, integer, integer, double precision[], integer, integer, bigint, bigint, text, text' then
      execute format('drop function if exists public.log_reaction_end(%s);', sig);
    end if;
  end loop;
end $$;

-- If older versions of these RPCs exist with an extra `event` argument,
-- drop them to avoid overload confusion.
drop function if exists public.log_reaction_start(text, text, text, text, integer, integer, text, text);
drop function if exists public.log_reaction_end(text, text, text, text, integer, integer, integer, double precision[], integer, integer, bigint, bigint, text, text);

-- RPC: log start event
create or replace function public.log_reaction_start(
  session_id text,
  client_id text,
  difficulty text,
  time_limit_sec integer,
  initial_grid integer,
  user_agent text,
  path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reaction_sessions (
    session_id, client_id, event, difficulty,
    time_limit_sec, initial_grid,
    user_agent, path
  ) values (
    coalesce(nullif(session_id,''), gen_random_uuid()::text),
    nullif(client_id,''),
    'start',
    lower(difficulty),
    greatest(0, time_limit_sec),
    greatest(2, initial_grid),
    user_agent,
    path
  );
end;
$$;

revoke all on function public.log_reaction_start(text, text, text, integer, integer, text, text) from public;
grant execute on function public.log_reaction_start(text, text, text, integer, integer, text, text) to anon, authenticated;

-- RPC: log end event
create or replace function public.log_reaction_end(
  session_id text,
  client_id text,
  difficulty text,
  rounds integer,
  avg_ms integer,
  hits integer,
  times_ms double precision[],
  time_limit_sec integer,
  initial_grid integer,
  started_at_ms bigint,
  ended_at_ms bigint,
  user_agent text,
  path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rounds integer := greatest(0, rounds);
  v_hits integer := greatest(0, hits);
  v_avg integer := greatest(0, avg_ms);
begin
  insert into public.reaction_sessions (
    session_id, client_id, event, difficulty,
    rounds, avg_ms, hits, times_ms,
    time_limit_sec, initial_grid,
    started_at_ms, ended_at_ms,
    user_agent, path
  ) values (
    coalesce(nullif(session_id,''), gen_random_uuid()::text),
    nullif(client_id,''),
    'end',
    lower(difficulty),
    v_rounds,
    v_avg,
    v_hits,
    coalesce(times_ms, array[]::double precision[]),
    greatest(0, time_limit_sec),
    greatest(2, initial_grid),
    started_at_ms,
    ended_at_ms,
    user_agent,
    path
  );
end;
$$;

revoke all on function public.log_reaction_end(text, text, text, integer, integer, integer, double precision[], integer, integer, bigint, bigint, text, text) from public;
grant execute on function public.log_reaction_end(text, text, text, integer, integer, integer, double precision[], integer, integer, bigint, bigint, text, text) to anon, authenticated;

comment on table public.reaction_sessions is 'Reaction game session events (start/end).';
comment on column public.reaction_sessions.times_ms is 'Per-hit reaction times in milliseconds (double precision).';
comment on function public.log_reaction_start is 'RPC to log reaction game session start';
comment on function public.log_reaction_end is 'RPC to log reaction game session end';
