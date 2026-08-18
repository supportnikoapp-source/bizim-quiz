-- Cavab göndərmə + 1–5 qiymət
-- Supabase SQL Editor-də işə sal.

drop policy if exists answers_select_own_or_mutual on public.answers;
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
    )
  );

create table if not exists public.ratings (
  room_id uuid not null references public.rooms(id) on delete cascade,
  rater_id uuid not null,
  question_id text not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (room_id, rater_id, question_id)
);

alter table public.ratings replica identity full;
alter table public.ratings enable row level security;

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

grant select on table public.ratings to authenticated;
grant execute on function public.send_answers(uuid) to authenticated;
grant execute on function public.rate_answer(uuid, text, int) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.ratings;
exception
  when duplicate_object then null;
end $$;
