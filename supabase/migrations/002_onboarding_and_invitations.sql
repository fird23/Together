-- Together: миграция 002 — онбординг, предпросмотр и отмена приглашений, расформирование пары.
-- Запустите один раз: Supabase Dashboard -> SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно, он ничего не ломает.

-- 1. Предпросмотр приглашения. Доступен и без входа: человек должен увидеть,
--    кто его зовёт, ещё до регистрации. Токен длиной 256 бит знает только получатель.
create or replace function public.get_invitation_preview(p_token_hash text)
returns table (state text, inviter_name text, start_date date, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  computed_state text;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 then
    return query select 'not_found'::text, null::text, null::date, null::timestamptz;
    return;
  end if;

  select * into inv from public.invitations where token_hash = p_token_hash;
  if not found then
    return query select 'not_found'::text, null::text, null::date, null::timestamptz;
    return;
  end if;

  if inv.status = 'accepted' then
    computed_state := 'used';
  elsif inv.status = 'revoked' then
    computed_state := 'revoked';
  elsif inv.status = 'expired' or inv.expires_at <= now() then
    computed_state := 'expired';
  elsif (select count(*) from public.couple_members where couple_id = inv.couple_id) >= 2 then
    computed_state := 'used';
  elsif auth.uid() is not null and inv.created_by = auth.uid() then
    computed_state := 'own';
  elsif auth.uid() is not null and exists (select 1 from public.couple_members where user_id = auth.uid()) then
    computed_state := 'in_couple';
  else
    computed_state := 'valid';
  end if;

  -- Имя и дату показываем только тому, у кого есть рабочая ссылка.
  if computed_state in ('valid', 'own', 'in_couple') then
    return query
      select computed_state,
             (select p.display_name from public.profiles p where p.id = inv.created_by),
             (select c.start_date from public.couples c where c.id = inv.couple_id),
             inv.expires_at;
  else
    return query select computed_state, null::text, null::date, null::timestamptz;
  end if;
end;
$$;

-- 2. Когда истекает активная ссылка моей пары (null — активной нет).
create or replace function public.my_pending_invitation()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select i.expires_at
  from public.invitations i
  join public.couple_members m on m.couple_id = i.couple_id and m.user_id = auth.uid()
  where i.status = 'pending' and i.expires_at > now()
  order by i.created_at desc
  limit 1;
$$;

-- 3. Отмена приглашения создателем (любым участником пары).
create or replace function public.revoke_invitation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  select couple_id into my_couple_id from public.couple_members where user_id = auth.uid();
  if my_couple_id is null then raise exception 'Вы не состоите в паре.'; end if;

  perform 1 from public.couples where id = my_couple_id for update;
  update public.invitations set status = 'revoked'
  where couple_id = my_couple_id and status = 'pending';
end;
$$;

-- 4. Расформирование пары. Удаляет пару, участников и приглашения (каскадом).
create or replace function public.dissolve_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  select couple_id into my_couple_id from public.couple_members where user_id = auth.uid();
  if my_couple_id is null then raise exception 'Вы не состоите в паре.'; end if;

  perform 1 from public.couples where id = my_couple_id for update;
  delete from public.couples where id = my_couple_id;
end;
$$;

-- 5. Дата начала не должна считаться «будущей» из-за часовых поясов: допускаем +1 день к UTC.
create or replace function public.create_couple_with_invitation(p_start_date date, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  if p_start_date > current_date + 1 then raise exception 'Дата начала отношений не может быть в будущем.'; end if;
  if p_start_date < date '1950-01-01' then raise exception 'Укажите дату не раньше 1950 года.'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Вы уже состоите в паре.';
  end if;
  if length(p_token_hash) <> 64 then raise exception 'Некорректное приглашение.'; end if;

  insert into public.couples (start_date) values (p_start_date) returning id into new_couple_id;
  insert into public.couple_members (couple_id, user_id) values (new_couple_id, auth.uid());
  insert into public.invitations (couple_id, created_by, token_hash) values (new_couple_id, auth.uid(), p_token_hash);
  return new_couple_id;
end;
$$;

-- 6. Права. Вызывать функции могут только вошедшие пользователи,
--    кроме предпросмотра приглашения (его видит и гость).
revoke all on function public.get_invitation_preview(text) from public;
revoke all on function public.my_pending_invitation() from public, anon;
revoke all on function public.revoke_invitation() from public, anon;
revoke all on function public.dissolve_couple() from public, anon;
revoke all on function public.create_couple_with_invitation(date, text) from public, anon;
revoke all on function public.create_invitation(uuid, text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.is_couple_member(uuid) from public, anon;
revoke all on function public.is_user_my_partner(uuid) from public, anon;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
grant execute on function public.my_pending_invitation() to authenticated;
grant execute on function public.revoke_invitation() to authenticated;
grant execute on function public.dissolve_couple() to authenticated;
grant execute on function public.create_couple_with_invitation(date, text) to authenticated;
grant execute on function public.create_invitation(uuid, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.is_user_my_partner(uuid) to authenticated;

-- Запретить пользователю менять email в профиле: это зеркало auth.users, его правит только триггер.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;
