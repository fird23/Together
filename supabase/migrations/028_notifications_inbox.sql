-- Список уведомлений в приложении: сервер записывает сюда всё, что отправляет пушем,
-- а колокольчик показывает историю с отметкой «прочитано». Видно только владельцу.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  url text,
  tag text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "Own notifications read" on public.notifications;
create policy "Own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Own notifications update" on public.notifications;
create policy "Own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Own notifications delete" on public.notifications;
create policy "Own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
