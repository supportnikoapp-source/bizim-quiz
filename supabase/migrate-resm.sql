-- Rəsm vuruşları. Supabase → SQL Editor → Run.

create table if not exists public.resm_state (
  who text primary key check (who in ('ilkin', 'fidan')),
  round int not null default 1,
  strokes text not null default '',
  ready boolean not null default false,
  finished boolean not null default false,
  vote text not null default '',
  seq int not null default 0,
  advance boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.resm_state add column if not exists seq int not null default 0;
alter table public.resm_state add column if not exists advance boolean not null default false;

alter table public.resm_state replica identity full;
alter table public.resm_state enable row level security;

drop policy if exists resm_state_select on public.resm_state;
create policy resm_state_select
  on public.resm_state for select
  to authenticated
  using (true);

drop policy if exists resm_state_write on public.resm_state;
create policy resm_state_write
  on public.resm_state for insert
  to authenticated
  with check (true);

drop policy if exists resm_state_update on public.resm_state;
create policy resm_state_update
  on public.resm_state for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.resm_state;
exception
  when duplicate_object then null;
end $$;
