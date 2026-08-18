-- Cavab kilidi: kilidli cavab göndəriləndə tərəfdaşa görünmür.
-- Supabase SQL Editor-də işə sal.

create table if not exists public.answer_locks (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, player_id, question_id)
);

alter table public.answer_locks replica identity full;
alter table public.answer_locks enable row level security;

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

grant select on table public.answer_locks to authenticated;
grant execute on function public.set_answer_lock(uuid, text, boolean) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.answer_locks;
exception
  when duplicate_object then null;
end $$;
