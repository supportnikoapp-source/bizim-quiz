-- Labirint canlı mövqe. Supabase → SQL Editor → Run.

create table if not exists public.labirint_state (
  who text primary key check (who in ('ilkin', 'fidan')),
  r int not null default 0,
  c int not null default 0,
  trail text not null default '',
  ready boolean not null default false,
  finished boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.labirint_state replica identity full;
alter table public.labirint_state enable row level security;

drop policy if exists labirint_state_select on public.labirint_state;
create policy labirint_state_select
  on public.labirint_state for select
  to authenticated
  using (true);

drop policy if exists labirint_state_write on public.labirint_state;
create policy labirint_state_write
  on public.labirint_state for insert
  to authenticated
  with check (true);

drop policy if exists labirint_state_update on public.labirint_state;
create policy labirint_state_update
  on public.labirint_state for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.labirint_state;
exception
  when duplicate_object then null;
end $$;
