-- Qarşılıqlı ekranlar: intro → rules → playing
-- Supabase SQL Editor-də bu faylı işə sal.

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms
  add constraint rooms_status_check
  check (status in ('waiting', 'intro', 'rules', 'playing', 'finished'));

alter table public.rooms
  add column if not exists host_ready boolean not null default false;
alter table public.rooms
  add column if not exists guest_ready boolean not null default false;

create or replace function public.join_room(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
  c text := upper(trim(p_code));
  n text := trim(p_name);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if n is null or char_length(n) < 1 then
    raise exception 'Ad lazımdır';
  end if;
  if c not like 'LOVE-%' then
    c := 'LOVE-' || c;
  end if;

  select * into r from public.rooms where code = c;
  if not found then
    raise exception 'Otaq tapılmadı';
  end if;

  if r.host_id = uid then
    return to_jsonb(r);
  end if;

  if r.guest_id = uid then
    update public.rooms
    set guest_name = left(n, 24)
    where id = r.id
    returning * into r;
    return to_jsonb(r);
  end if;

  if r.guest_id is not null then
    raise exception 'Otaq doludur';
  end if;

  update public.rooms
  set
    guest_id = uid,
    guest_name = left(n, 24),
    status = 'intro',
    host_ready = false,
    guest_ready = false
  where id = r.id and guest_id is null
  returning * into r;

  if r.guest_id is distinct from uid then
    raise exception 'Otaq doludur';
  end if;

  return to_jsonb(r);
end;
$$;

create or replace function public.mark_ready(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Otaq tapılmadı';
  end if;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  if uid = r.host_id then
    r.host_ready := true;
  else
    r.guest_ready := true;
  end if;

  if r.host_ready and r.guest_ready then
    if r.status = 'intro' then
      r.status := 'rules';
      r.host_ready := false;
      r.guest_ready := false;
    elsif r.status = 'rules' then
      r.status := 'playing';
      r.host_ready := false;
      r.guest_ready := false;
    end if;
  end if;

  update public.rooms
  set
    status = r.status,
    host_ready = r.host_ready,
    guest_ready = r.guest_ready
  where id = r.id
  returning * into r;

  return to_jsonb(r);
end;
$$;

grant execute on function public.mark_ready(uuid) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
