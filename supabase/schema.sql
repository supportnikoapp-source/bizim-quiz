-- bizim-quiz — Supabase setup
--
-- 1. https://supabase.com  → New project
-- 2. Authentication → Sign In / Providers → Anonymous → Enable
-- 3. SQL Editor → bu faylı tam işə sal
-- 4. Project Settings → API → URL və anon key-i .env.local-a yapışdır

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null,
  guest_id uuid,
  host_name text not null,
  guest_name text,
  status text not null default 'waiting' check (status in ('waiting', 'intro', 'rules', 'playing', 'finished')),
  question_index int not null default 0,
  host_share boolean not null default false,
  guest_share boolean not null default false,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  share_request_from uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, player_id, question_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  question_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (room_id, player_id, question_id)
);

create table if not exists public.ratings (
  room_id uuid not null references public.rooms(id) on delete cascade,
  rater_id uuid not null,
  question_id text not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (room_id, rater_id, question_id)
);

create table if not exists public.answer_locks (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, player_id, question_id)
);

create index if not exists submissions_room_question_idx
  on public.submissions (room_id, question_id);

alter table public.rooms replica identity full;
alter table public.submissions replica identity full;
alter table public.answers replica identity full;
alter table public.ratings replica identity full;
alter table public.answer_locks replica identity full;

alter table public.rooms enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.ratings enable row level security;
alter table public.answer_locks enable row level security;

drop policy if exists rooms_select_members on public.rooms;
create policy rooms_select_members
  on public.rooms for select
  to authenticated
  using (host_id = auth.uid() or guest_id = auth.uid());

drop policy if exists submissions_select_members on public.submissions;
create policy submissions_select_members
  on public.submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = submissions.room_id
        and (r.host_id = auth.uid() or r.guest_id = auth.uid())
    )
  );

drop policy if exists answers_select_own_or_mutual on public.answers;
drop policy if exists answers_select_own_or_sent on public.answers;
create policy answers_select_own_or_sent
  on public.answers for select
  to authenticated
  using (
    player_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = answers.room_id
        and (r.host_id = auth.uid() or r.guest_id = auth.uid())
        and (
          (answers.player_id = r.host_id and r.host_share = true)
          or (answers.player_id = r.guest_id and r.guest_share = true)
        )
        and not exists (
          select 1 from public.answer_locks l
          where l.room_id = answers.room_id
            and l.player_id = answers.player_id
            and l.question_id = answers.question_id
        )
    )
  );

drop policy if exists ratings_select_members on public.ratings;
create policy ratings_select_members
  on public.ratings for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = ratings.room_id
        and (r.host_id = auth.uid() or r.guest_id = auth.uid())
    )
  );

drop policy if exists answer_locks_select_members on public.answer_locks;
create policy answer_locks_select_members
  on public.answer_locks for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = answer_locks.room_id
        and (r.host_id = auth.uid() or r.guest_id = auth.uid())
    )
  );

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := 'LOVE-';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where rooms.code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_room(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  n text := trim(p_name);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if n is null or char_length(n) < 1 then
    raise exception 'Ad lazımdır';
  end if;

  insert into public.rooms (code, host_id, host_name, status)
  values (public.generate_room_code(), auth.uid(), left(n, 24), 'waiting')
  returning * into r;

  return to_jsonb(r);
end;
$$;

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

create or replace function public.peek_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  c text := upper(trim(p_code));
begin
  if c not like 'LOVE-%' then
    c := 'LOVE-' || c;
  end if;

  select * into r from public.rooms where code = c;
  if not found then
    return jsonb_build_object('exists', false, 'full', false);
  end if;

  return jsonb_build_object(
    'exists', true,
    'full', r.guest_id is not null,
    'code', r.code,
    'host_name', r.host_name,
    'status', r.status
  );
end;
$$;

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

create or replace function public.submit_answer(p_room_id uuid, p_question_id text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
  body text := trim(p_body);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if body is null or char_length(body) < 1 then
    raise exception 'Cavab boş ola bilməz';
  end if;

  select * into r from public.rooms where id = p_room_id;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  insert into public.answers (room_id, player_id, question_id, body)
  values (p_room_id, uid, p_question_id, body)
  on conflict (room_id, player_id, question_id) do nothing;

  insert into public.submissions (room_id, player_id, question_id)
  values (p_room_id, uid, p_question_id)
  on conflict do nothing;
end;
$$;

create or replace function public.try_advance(
  p_room_id uuid,
  p_question_id text,
  p_from_index int,
  p_total int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
  host_done boolean;
  guest_done boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  if r.guest_id is null then
    return to_jsonb(r);
  end if;

  if r.question_index is distinct from p_from_index then
    return to_jsonb(r);
  end if;

  select exists (
    select 1 from public.submissions s
    where s.room_id = p_room_id
      and s.question_id = p_question_id
      and s.player_id = r.host_id
  ) into host_done;

  select exists (
    select 1 from public.submissions s
    where s.room_id = p_room_id
      and s.question_id = p_question_id
      and s.player_id = r.guest_id
  ) into guest_done;

  if not host_done or not guest_done then
    return to_jsonb(r);
  end if;

  update public.rooms
  set
    question_index = p_from_index + 1,
    status = case
      when p_from_index + 1 >= p_total then 'finished'
      else 'playing'
    end
  where id = p_room_id and question_index = p_from_index
  returning * into r;

  if r.id is null then
    select * into r from public.rooms where id = p_room_id;
  end if;

  return to_jsonb(r);
end;
$$;

create or replace function public.set_share(p_room_id uuid, p_accept boolean)
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

  select * into r from public.rooms where id = p_room_id;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  if not p_accept then
    update public.rooms
    set host_share = false, guest_share = false, share_request_from = null
    where id = p_room_id
    returning * into r;
    return to_jsonb(r);
  end if;

  if uid = r.host_id then
    update public.rooms
    set
      host_share = true,
      share_request_from = case when guest_share then share_request_from else uid end
    where id = p_room_id
    returning * into r;
  else
    update public.rooms
    set
      guest_share = true,
      share_request_from = case when host_share then share_request_from else uid end
    where id = p_room_id
    returning * into r;
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

create or replace function public.send_answers(p_room_id uuid)
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
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  if uid = r.host_id then
    update public.rooms set host_share = true where id = p_room_id returning * into r;
  else
    update public.rooms set guest_share = true where id = p_room_id returning * into r;
  end if;

  return to_jsonb(r);
end;
$$;

create or replace function public.rate_answer(p_room_id uuid, p_question_id text, p_score int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  uid uuid := auth.uid();
  sent boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_score < 1 or p_score > 5 then
    raise exception 'Qiymət 1–5 olmalıdır';
  end if;

  select * into r from public.rooms where id = p_room_id;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  sent := case
    when uid = r.host_id then r.guest_share
    else r.host_share
  end;
  if not sent then
    raise exception 'Cavablar hələ göndərilməyib';
  end if;

  insert into public.ratings (room_id, rater_id, question_id, score)
  values (p_room_id, uid, p_question_id, p_score)
  on conflict (room_id, rater_id, question_id)
  do update set score = excluded.score;

  return jsonb_build_object('ok', true, 'score', p_score);
end;
$$;

create or replace function public.set_answer_lock(
  p_room_id uuid,
  p_question_id text,
  p_locked boolean
)
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
  if p_question_id is null or char_length(trim(p_question_id)) < 1 then
    raise exception 'Sual tapılmadı';
  end if;

  select * into r from public.rooms where id = p_room_id;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  if p_locked then
    insert into public.answer_locks (room_id, player_id, question_id)
    values (p_room_id, uid, p_question_id)
    on conflict do nothing;
  else
    delete from public.answer_locks
    where room_id = p_room_id and player_id = uid and question_id = p_question_id;
  end if;

  return jsonb_build_object('ok', true, 'locked', p_locked, 'question_id', p_question_id);
end;
$$;

create or replace function public.clear_my_answer(p_room_id uuid, p_question_id text)
returns void
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

  select * into r from public.rooms where id = p_room_id;
  if r.host_id is distinct from uid and r.guest_id is distinct from uid then
    raise exception 'Forbidden';
  end if;

  delete from public.submissions
  where room_id = p_room_id and player_id = uid and question_id = p_question_id;

  delete from public.answers
  where room_id = p_room_id and player_id = uid and question_id = p_question_id;
end;
$$;

grant select on table public.rooms to authenticated;
grant select on table public.submissions to authenticated;
grant select on table public.answers to authenticated;

grant execute on function public.enter_pair_room(text) to authenticated;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.peek_room(text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.submit_answer(uuid, text, text) to authenticated;
grant execute on function public.try_advance(uuid, text, int, int) to authenticated;
grant execute on function public.set_share(uuid, boolean) to authenticated;
grant execute on function public.mark_ready(uuid) to authenticated;
grant execute on function public.send_answers(uuid) to authenticated;
grant execute on function public.rate_answer(uuid, text, int) to authenticated;
grant select on table public.ratings to authenticated;
grant select on table public.answer_locks to authenticated;
grant execute on function public.set_answer_lock(uuid, text, boolean) to authenticated;
grant execute on function public.clear_my_answer(uuid, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ratings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.answer_locks;
exception
  when duplicate_object then null;
end $$;
