-- Проверка уведомлений из самого приложения: ставит тестовый пуш в очередь только для вас
-- и сообщает, сколько у вас подключённых устройств и настроен ли сервер.
create or replace function public.send_test_push()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  android int := 0;
  web int := 0;
  configured boolean := false;
begin
  if uid is null then raise exception 'Нужно войти в аккаунт.'; end if;
  if to_regclass('public.push_config') is not null then
    execute 'select exists (select 1 from public.push_config)' into configured;
  end if;
  select count(*) into android from public.device_tokens where user_id = uid;
  select count(*) into web from public.push_subscriptions where user_id = uid;
  if configured and (android + web) > 0 then
    perform public.notify_push(jsonb_build_object('type', 'test', 'user_id', uid));
  end if;
  return jsonb_build_object('configured', configured, 'android', android, 'web', web);
end;
$$;
revoke all on function public.send_test_push() from public, anon;
grant execute on function public.send_test_push() to authenticated;
