-- Adımdan söz tap. Supabase → SQL Editor → Run.

create table if not exists public.ad_state (
  who text primary key check (who in ('ilkin', 'fidan')),
  words text not null default '[]',
  ready boolean not null default false,
  finished boolean not null default false,
  advance boolean not null default false,
  seq int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ad_state replica identity full;
alter table public.ad_state enable row level security;

drop policy if exists ad_state_select on public.ad_state;
create policy ad_state_select
  on public.ad_state for select
  to authenticated
  using (true);

drop policy if exists ad_state_write on public.ad_state;
create policy ad_state_write
  on public.ad_state for insert
  to authenticated
  with check (true);

drop policy if exists ad_state_update on public.ad_state;
create policy ad_state_update
  on public.ad_state for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.ad_state;
exception
  when duplicate_object then null;
end $$;
