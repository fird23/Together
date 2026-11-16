-- Расширенная админ-панель: история заходов по дням, платформа и версия, журнал ошибок приложения
-- и общий отчёт. Везде только агрегаты и технические данные, без личного содержимого пар.
-- Порядок: после 025_admin_panel, 028 и 034.

-- 1. Заходы по дням (одна строка на человека в день): нужны для графика активности.
create table if not exists public.activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  platform text,
  primary key (user_id, day)
);
create index if not exists activity_days_day_idx on public.activity_days(day);
alter table public.activity_days enable row level security;
revoke all on public.activity_days from anon, authenticated;

alter table public.profiles add column if not exists last_platform text;
alter table public.profiles add column if not exists last_build text;

drop function if exists public.touch_last_seen();
create or replace function public.touch_last_seen(p_platform text default null, p_build text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.profiles
     set last_seen_at = now(), last_platform = left(p_platform, 24), last_build = left(p_build, 24)
   where id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '30 minutes'
          or last_platform is distinct from left(p_platform, 24) or last_build is distinct from left(p_build, 24));
  insert into public.activity_days (user_id, day, platform) values (auth.uid(), current_date, left(p_platform, 24))
  on conflict (user_id, day) do nothing;
end;
$$;
revoke all on function public.touch_last_seen(text, text) from public, anon;
grant execute on function public.touch_last_seen(text, text) to authenticated;

-- 2. Ошибки приложения: приходят из браузера через функцию (не чаще 20 в час от одного человека).
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  stack text,
  path text,
  platform text,
  build text,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx on public.client_errors(created_at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

create or replace function public.report_client_error(p_message text, p_stack text default null, p_path text default null, p_platform text default null, p_build text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(btrim(p_message), '') = '' then return; end if;
  if (select count(*) from public.client_errors where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then return; end if;
  insert into public.client_errors (user_id, message, stack, path, platform, build)
  values (auth.uid(), left(p_message, 300), left(p_stack, 1500), left(p_path, 120), left(p_platform, 24), left(p_build, 24));
end;
$$;
revoke all on function public.report_client_error(text, text, text, text, text) from public, anon;
grant execute on function public.report_client_error(text, text, text, text, text) to authenticated;

-- 3. Отчёт для администратора.
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Нет доступа.'; end if;
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
      'new_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
      'active_today', (select count(distinct user_id) from public.activity_days where day = current_date),
      'active_7d', (select count(distinct user_id) from public.activity_days where day > current_date - 7),
      'active_30d', (select count(distinct user_id) from public.activity_days where day > current_date - 30),
      'never_seen', (select count(*) from public.profiles where last_seen_at is null)
    ),
    'couples', jsonb_build_object(
      'total', (select count(*) from public.couples),
      'complete', (select count(*) from (select couple_id from public.couple_members group by couple_id having count(*) = 2) c),
      'single', (select count(*) from (select couple_id from public.couple_members group by couple_id having count(*) = 1) c),
      'active_7d', (select count(distinct cm.couple_id) from public.couple_members cm join public.activity_days a on a.user_id = cm.user_id where a.day > current_date - 7),
      'active_30d', (select count(distinct cm.couple_id) from public.couple_members cm join public.activity_days a on a.user_id = cm.user_id where a.day > current_date - 30)
    ),
    'dau', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'users', coalesce(c.n, 0)) order by d), '[]'::jsonb)
            from generate_series(current_date - 13, current_date, interval '1 day') d
            left join (select day, count(*) n from public.activity_days group by day) c on c.day = d::date),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'users', coalesce(c.n, 0)) order by d), '[]'::jsonb)
            from generate_series(current_date - 13, current_date, interval '1 day') d
            left join (select created_at::date as day, count(*) as n from public.profiles group by 1) c on c.day = d::date),    'usage_7d', jsonb_build_object(
      'habit_checkins', (select count(*) from public.habit_checkins where created_at > now() - interval '7 days'),
      'todos_done', (select count(*) from public.todos where done_at > now() - interval '7 days'),
      'moods', (select count(*) from public.mood_entries where created_at > now() - interval '7 days'),
      'gratitude', (select count(*) from public.gratitude_notes where created_at > now() - interval '7 days'),
      'talk_threads', (select count(*) from public.talk_threads where created_at > now() - interval '7 days'),
      'talk_replies', (select count(*) from public.talk_replies where created_at > now() - interval '7 days'),
      'calendar_events', (select count(*) from public.calendar_events where created_at > now() - interval '7 days'),
      'wishes', (select count(*) from public.wishlist_items where created_at > now() - interval '7 days'),
      'album_items', (select count(*) from public.album_photos where created_at > now() - interval '7 days')
    ),
    'features_off', (select coalesce(jsonb_object_agg(key, n), '{}'::jsonb)
                     from (select key, count(*) n from public.couples, jsonb_each_text(features) where value = 'false' group by key) t),
    'platforms', (select coalesce(jsonb_object_agg(p, n), '{}'::jsonb)
                  from (select coalesce(last_platform, 'нет данных') p, count(*) n from public.profiles where last_seen_at > now() - interval '30 days' group by 1) t),
    'builds', (select coalesce(jsonb_agg(jsonb_build_object('build', b, 'users', n) order by n desc), '[]'::jsonb)
               from (select coalesce(last_build, 'нет данных') b, count(*) n from public.profiles where last_seen_at > now() - interval '30 days' group by 1 order by 2 desc limit 8) t),
    'push', jsonb_build_object(
      'android_devices', (select count(distinct user_id) from public.device_tokens),
      'web_users', (select count(distinct user_id) from public.push_subscriptions),
      'prefs_users', (select count(*) from public.notification_prefs),
      'inbox_total', (select count(*) from public.notifications),
      'inbox_unread', (select count(*) from public.notifications where read_at is null)
    ),
    'storage', (select coalesce(jsonb_object_agg(bucket_id, jsonb_build_object('files', n, 'bytes', b)), '{}'::jsonb)
                from (select bucket_id, count(*) n, coalesce(sum((metadata->>'size')::bigint), 0) b from storage.objects group by bucket_id) t),
    'album', jsonb_build_object(
      'photos', (select count(*) from public.album_photos where coalesce(kind, 'photo') = 'photo'),
      'videos', (select count(*) from public.album_photos where kind = 'video')
    ),
    'support', jsonb_build_object(
      'open', (select count(*) from public.support_tickets where status in ('new', 'in_progress')),
      'avg_reply_hours', (select round((avg(extract(epoch from (updated_at - created_at)) / 3600))::numeric, 1) from public.support_tickets where admin_reply is not null),
      'oldest_open_days', (select max(extract(day from now() - created_at)) from public.support_tickets where status in ('new', 'in_progress')),
      'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.support_tickets group by status) t)
    ),
    'errors', jsonb_build_object(
      'last_24h', (select count(*) from public.client_errors where created_at > now() - interval '24 hours'),
      'last_7d', (select count(*) from public.client_errors where created_at > now() - interval '7 days')
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- 4. Повторяющиеся ошибки за неделю (одинаковые сообщения собраны вместе).
create or replace function public.admin_errors()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Нет доступа.'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t) order by t.last_at desc), '[]'::jsonb)
          from (select message, count(*) as n, count(distinct user_id) as users, max(created_at) as last_at, max(path) as path,
                       max(build) as build, (array_agg(stack order by created_at desc))[1] as stack
                  from public.client_errors where created_at > now() - interval '7 days'
                 group by message order by max(created_at) desc limit 25) t);
end;
$$;
revoke all on function public.admin_errors() from public, anon;
grant execute on function public.admin_errors() to authenticated;
