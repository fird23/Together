-- 1) Switchable features per couple (habits, wishlist). Calendar and mood are always on.
alter table public.couples add column if not exists features jsonb not null default '{}'::jsonb;

-- 2) Web Push: devices and per-user notification preferences.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  habits boolean not null default true,
  habits_hour smallint not null default 20 check (habits_hour between 0 and 23),
  dates boolean not null default true,
  events boolean not null default true,
  partner_mood boolean not null default true,
  partner_habits boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "Users manage own notification prefs" on public.notification_prefs;
create policy "Users manage own notification prefs" on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.notification_prefs to authenticated;
