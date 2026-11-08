-- Уведомления: расписание и события. Выполните ОДИН раз в Supabase → SQL Editor.
--
-- Перед запуском замените в блоке «2» две вещи:
--   ВАШ-ПРОЕКТ  →  идентификатор проекта (из адреса https://ВАШ-ПРОЕКТ.supabase.co)
--   ВАШ_СЕКРЕТ  →  любая длинная строка (те же символы нужно вписать в секрет WEBHOOK_SECRET функции push-notify)

-- 1. Расширения для отправки запросов и расписания
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 2. Адрес функции и секрет (таблица закрыта: читать её может только сервер)
create table if not exists public.push_config (
  id boolean primary key default true check (id),
  function_url text not null,
  secret text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

insert into public.push_config (function_url, secret)
values ('https://ВАШ-ПРОЕКТ.supabase.co/functions/v1/push-notify', 'ВАШ_СЕКРЕТ')
on conflict (id) do update set function_url = excluded.function_url, secret = excluded.secret;

-- 3. Отправка запроса функции. Ошибка здесь никогда не мешает сохранению данных.
create or replace function public.notify_push(payload jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare cfg record;
begin
  select * into cfg from public.push_config where id;
  if not found then return; end if;
  perform net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', cfg.secret),
    body := payload);
exception when others then
  null;
end;
$$;
revoke all on function public.notify_push(jsonb) from public, anon, authenticated;

-- 4. События: партнёр отметил настроение или выполнил привычку
create or replace function public.push_on_change()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.notify_push(jsonb_build_object(
    'type', tg_op, 'table', tg_table_name, 'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end));
  return new;
end;
$$;
revoke all on function public.push_on_change() from public, anon, authenticated;

drop trigger if exists push_mood on public.mood_entries;
create trigger push_mood after insert or update on public.mood_entries
  for each row execute function public.push_on_change();
drop trigger if exists push_checkin on public.habit_checkins;
create trigger push_checkin after insert on public.habit_checkins
  for each row execute function public.push_on_change();

-- 5. Расписание: раз в час (напоминания о привычках, особые дни, события календаря)
select cron.schedule('push-hourly', '0 * * * *', $$ select public.notify_push('{"type":"cron"}'::jsonb) $$);
