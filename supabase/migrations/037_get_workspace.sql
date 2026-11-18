-- Быстрая загрузка рабочего пространства: один запрос вместо четырёх последовательных.
-- Возвращает мой профиль, мою пару, id участников, профиль партнёра и моё имя для партнёра.
-- Функция работает с правами вызывающего (security invoker), поэтому политики RLS действуют как обычно.
-- Если эту миграцию ещё не применили, сайт сам вернётся к прежним запросам. Безопасно выполнять повторно.
-- Порядок: после 032_partner_alias.

create or replace function public.get_workspace()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  pid uuid;
begin
  if uid is null then
    return null;
  end if;

  select m.couple_id into cid from public.couple_members m where m.user_id = uid limit 1;
  if cid is not null then
    select m.user_id into pid from public.couple_members m where m.couple_id = cid and m.user_id <> uid limit 1;
  end if;

  return jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'couple', (select to_jsonb(c) from public.couples c where c.id = cid),
    'member_ids', coalesce((select jsonb_agg(m.user_id) from public.couple_members m where m.couple_id = cid), '[]'::jsonb),
    'partner', (select to_jsonb(p) from public.profiles p where p.id = pid),
    'alias', (select a.alias from public.partner_aliases a where a.user_id = uid and a.partner_id = pid)
  );
end;
$$;

revoke all on function public.get_workspace() from public, anon;
grant execute on function public.get_workspace() to authenticated;
