-- Админ-панель: администраторы, журнал действий, агрегаты без личного содержимого пар,
-- ответы на обращения с уведомлением автору.

-- 1. Администраторы. Таблицу читает только сама функция is_admin() и сам администратор.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "Admin sees own row" on public.admins;
create policy "Admin sees own row" on public.admins
  for select to authenticated using (user_id = auth.uid());
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Когда пользователь последний раз открывал приложение (нужно только для счётчиков активности).
alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_last_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.profiles set last_seen_at = now()
  where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '30 minutes');
end;
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- 3. Журнал действий администратора. Читать может только администратор, писать только триггеры и функции.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log
  for select to authenticated using (public.is_admin());
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

-- 4. Обращения: администратор видит все и может менять только статус и ответ.
drop policy if exists "Admins read all tickets" on public.support_tickets;
create policy "Admins read all tickets" on public.support_tickets
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins update tickets" on public.support_tickets;
create policy "Admins update tickets" on public.support_tickets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (status, admin_reply, updated_at) on public.support_tickets to authenticated;

create or replace function public.on_ticket_admin_update()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  new.updated_at := now();
  insert into public.admin_audit_log (admin_id, action, target, details)
  values (auth.uid(), 'ticket_update', new.id::text,
    jsonb_build_object('status_from', old.status, 'status_to', new.status,
                       'reply_changed', new.admin_reply is distinct from old.admin_reply));
  return new;
end;
$$;
drop trigger if exists support_tickets_admin_update on public.support_tickets;
create trigger support_tickets_admin_update before update on public.support_tickets
  for each row execute function public.on_ticket_admin_update();

-- Пуш автору, когда появился новый ответ. Ошибка здесь никогда не мешает сохранению ответа.
create or replace function public.push_on_ticket_reply()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.user_id is not null and new.admin_reply is not null
     and new.admin_reply is distinct from old.admin_reply then
    begin
      perform public.notify_push(jsonb_build_object(
        'type', 'UPDATE', 'table', 'support_tickets',
        'record', jsonb_build_object('user_id', new.user_id, 'admin_reply', new.admin_reply)));
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;
revoke all on function public.push_on_ticket_reply() from public, anon, authenticated;
drop trigger if exists support_tickets_reply_push on public.support_tickets;
create trigger support_tickets_reply_push after update on public.support_tickets
  for each row execute function public.push_on_ticket_reply();

-- 5. Только агрегаты: числа, без настроений, разговоров, дел, фото и другого личного содержимого.
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Нет доступа.'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'couples', (select count(*) from public.couples),
    'couples_complete', (select count(*) from (select couple_id from public.couple_members group by couple_id having count(*) = 2) c),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_7d', (select count(*) from public.profiles where last_seen_at > now() - interval '7 days'),
    'active_30d', (select count(*) from public.profiles where last_seen_at > now() - interval '30 days'),
    'android_devices', (select count(distinct user_id) from public.device_tokens),
    'web_push_users', (select count(distinct user_id) from public.push_subscriptions),
    'tickets', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                from (select status, count(*) n from public.support_tickets group by status) t)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 6. Как назначить администратора (выполнить вручную, подставив свой email):
--   insert into public.admins (user_id) select id from auth.users where email = 'ВАШ_EMAIL';
