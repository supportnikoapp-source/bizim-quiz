-- Yapboz canlı taxta. Supabase → SQL Editor → Run.

create table if not exists public.yapboz_state (
  who text primary key check (who in ('ilkin', 'fidan')),
  board text not null default '',
  ready boolean not null default false,
  finished boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.yapboz_state replica identity full;
alter table public.yapboz_state enable row level security;

drop policy if exists yapboz_state_select on public.yapboz_state;
create policy yapboz_state_select
  on public.yapboz_state for select
  to authenticated
  using (true);

drop policy if exists yapboz_state_write on public.yapboz_state;
create policy yapboz_state_write
  on public.yapboz_state for insert
  to authenticated
  with check (true);

drop policy if exists yapboz_state_update on public.yapboz_state;
create policy yapboz_state_update
  on public.yapboz_state for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.yapboz_state;
exception
  when duplicate_object then null;
end $$;
