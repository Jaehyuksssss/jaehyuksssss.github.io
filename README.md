# my-Gatsby-blog

```jsx
//Link
https://jaehyuksssss.github.io
```

## View Counter (Supabase)

- Per-post views increment on page open via Supabase RPC `inc_post_view(slug text)`.
- Total views are shown on the home hero by summing all posts or via RPC `get_total_views()`.

### Setup

1. Create a Supabase project and note your Project URL and anon key.

2. In Supabase SQL editor, run:

```
create table if not exists public.post_views (
  slug text primary key,
  view_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.post_views enable row level security;

drop policy if exists "read post_views" on public.post_views;
create policy "read post_views"
  on public.post_views for select
  to anon, authenticated
  using (true);

create or replace function public.inc_post_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  insert into public.post_views as v (slug, view_count)
  values (p_slug, 1)
  on conflict (slug)
  do update set view_count = v.view_count + 1,
               updated_at = now()
  returning v.view_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.inc_post_view(text) from public;
grant execute on function public.inc_post_view(text) to anon, authenticated;

-- Optional convenience function for total
create or replace function public.get_total_views()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(view_count), 0)::bigint from public.post_views;
$$;

revoke all on function public.get_total_views() from public;
grant execute on function public.get_total_views() to anon, authenticated;
```

3. Add env vars for Gatsby (client-side):

- `.env.development` and CI build env:

```
GATSBY_SUPABASE_URL=your-project-url
GATSBY_SUPABASE_ANON_KEY=your-anon-key
```

4. Install dependency:

```
npm i @supabase/supabase-js
```

Done. Per-post counts appear on post pages; total appears on the home hero.
