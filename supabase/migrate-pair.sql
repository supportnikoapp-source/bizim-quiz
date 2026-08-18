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

  if r.guest_id is null then
    if r.host_id = uid or r.host_name = n then
      update public.rooms
      set host_id = uid, host_name = n
      where id = r.id
      returning * into r;
    else
      update public.rooms
      set guest_id = uid, guest_name = n
      where id = r.id and guest_id is null
      returning * into r;
      if r.guest_id is distinct from uid then
        raise exception 'Otaq doludur';
      end if;
    end if;
  elsif r.host_id = uid or r.guest_id = uid or r.host_name = n or coalesce(r.guest_name, '') = n then
    update public.rooms
    set
      host_id = uid,
      host_name = n,
      guest_id = null,
      guest_name = null
    where id = r.id
    returning * into r;
  else
    raise exception 'Otaq doludur';
  end if;

  delete from public.submissions where room_id = r.id;
  delete from public.answers where room_id = r.id;
  delete from public.ratings where room_id = r.id;
  delete from public.answer_locks where room_id = r.id;

  update public.rooms
  set
    question_index = 0,
    host_share = false,
    guest_share = false,
    host_ready = false,
    guest_ready = false,
    share_request_from = null,
    status = case when guest_id is null then 'waiting' else 'intro' end
  where id = r.id
  returning * into r;

  return to_jsonb(r);
end;
$$;

grant execute on function public.enter_pair_room(text) to authenticated;
