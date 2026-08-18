-- WhatsApp linkindən göndərilmiş cavablara baxmaq.
-- Supabase SQL Editor-də işə sal.

create or replace function public.view_shared_answers(p_code text)
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
    return jsonb_build_object('exists', false);
  end if;

  return jsonb_build_object(
    'exists', true,
    'code', r.code,
    'host_name', r.host_name,
    'guest_name', r.guest_name,
    'host_share', r.host_share,
    'guest_share', r.guest_share,
    'answers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'player_id', a.player_id,
          'player_name', case
            when a.player_id = r.host_id then r.host_name
            else coalesce(r.guest_name, 'Oyunçu')
          end,
          'question_id', a.question_id,
          'body', case
            when exists (
              select 1 from public.answer_locks l
              where l.room_id = a.room_id
                and l.player_id = a.player_id
                and l.question_id = a.question_id
            ) then null
            when a.player_id = r.host_id and r.host_share then a.body
            when a.player_id = r.guest_id and r.guest_share then a.body
            else null
          end,
          'locked', exists (
            select 1 from public.answer_locks l
            where l.room_id = a.room_id
              and l.player_id = a.player_id
              and l.question_id = a.question_id
          ),
          'shared', case
            when a.player_id = r.host_id then r.host_share
            when a.player_id = r.guest_id then r.guest_share
            else false
          end
        )
        order by a.created_at
      )
      from public.answers a
      where a.room_id = r.id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.view_shared_answers(text) to authenticated;
grant execute on function public.view_shared_answers(text) to anon;
