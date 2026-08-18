-- Sabit otaq: kod yoxdur, İlkin və Fidan birbaşa qoşulur.
-- Supabase SQL Editor-də işə sal.

create or replace function public.enter_pair_room(p_who text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
  who text := lower(trim(p_who));
  n text;
  pair text := 'LOVE-BIZIM';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if who = 'fidan' then
    n := 'Fidan';
  else
    n := 'İlkin';
  end if;

  select * into r from public.rooms where code = pair for update;

  if not found then
    insert into public.rooms (code, host_id, host_name, status)
    values (pair, uid, n, 'waiting')
    returning * into r;
    return to_jsonb(r);
  end if;

  if r.host_id = uid then
    update public.rooms set host_name = n where id = r.id returning * into r;
    return to_jsonb(r);
  end if;

  if r.guest_id is not null and r.guest_id = uid then
    update public.rooms set guest_name = n where id = r.id returning * into r;
    return to_jsonb(r);
  end if;

  if r.host_name = n then
    update public.rooms set host_id = uid, host_name = n where id = r.id returning * into r;
    return to_jsonb(r);
  end if;

  if r.guest_name is not null and r.guest_name = n then
    update public.rooms set guest_id = uid, guest_name = n where id = r.id returning * into r;
    return to_jsonb(r);
  end if;

  if r.guest_id is null then
    update public.rooms
    set
      guest_id = uid,
      guest_name = n,
      status = case when r.status = 'waiting' then 'intro' else r.status end,
      host_ready = false,
      guest_ready = false
    where id = r.id and guest_id is null
    returning * into r;
    return to_jsonb(r);
  end if;

  raise exception 'Otaq doludur';
end;
$$;

grant execute on function public.enter_pair_room(text) to authenticated;
