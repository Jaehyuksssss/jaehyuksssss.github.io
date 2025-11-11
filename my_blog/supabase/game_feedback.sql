-- Game feedback board (global for all games)
create extension if not exists pgcrypto;

create table if not exists public.game_feedback (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 20),
  email text not null check (char_length(trim(email)) between 3 and 320),
  content text not null check (char_length(trim(content)) between 10 and 1000),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  user_agent text,
  path text
);

alter table public.game_feedback enable row level security;

-- Insert via RPC only; do not allow direct select with emails

create or replace function public.gf_submit_feedback(
  p_name text,
  p_email text,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
  v_email text;
  v_content text;
  v_ua text;
  v_path text;
begin
  v_name := trim(p_name);
  v_email := trim(p_email);
  v_content := trim(p_content);
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 20 then
    raise exception 'invalid name';
  end if;
  if v_email is null or char_length(v_email) < 3 or char_length(v_email) > 320 or position('@' in v_email) = 0 then
    raise exception 'invalid email';
  end if;
  if v_content is null or char_length(v_content) < 10 or char_length(v_content) > 1000 then
    raise exception 'invalid content';
  end if;

  v_ua := current_setting('request.headers', true);
  v_path := current_setting('request.path', true);

  insert into public.game_feedback (display_name, email, content, is_public, user_agent, path)
  values (v_name, v_email, v_content, true, v_ua, v_path);
end;
$$;
revoke all on function public.gf_submit_feedback(text, text, text) from public;
grant execute on function public.gf_submit_feedback(text, text, text) to anon, authenticated;

create or replace function public.gf_recent_public(p_limit int default 10)
returns table (
  id uuid,
  display_name text,
  content text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select id, display_name, content, created_at
  from public.game_feedback
  where is_public is true
  order by created_at desc
  limit greatest(1, coalesce(p_limit, 10));
$$;
grant execute on function public.gf_recent_public(int) to anon, authenticated;
