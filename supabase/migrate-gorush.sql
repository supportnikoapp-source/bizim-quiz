-- Görüş canlı mövqe. Supabase → SQL Editor → Run.

create table if not exists public.gorush_state (
  who text primary key check (who in ('ilkin', 'fidan')),
  r int not null default 0,
  c int not null default 0,
  trail text not null default '',
  ready boolean not null default false,
  finished boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.gorush_state replica identity full;
alter table public.gorush_state enable row level security;

drop policy if exists gorush_state_select on public.gorush_state;
create policy gorush_state_select
  on public.gorush_state for select
  to authenticated
  using (true);

drop policy if exists gorush_state_write on public.gorush_state;
create policy gorush_state_write
  on public.gorush_state for insert
  to authenticated
  with check (true);

drop policy if exists gorush_state_update on public.gorush_state;
create policy gorush_state_update
  on public.gorush_state for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.gorush_state;
exception
  when duplicate_object then null;
end $$;
