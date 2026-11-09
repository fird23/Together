-- 0) Возвращаем защитную функцию из 009 (ранняя версия 020 могла её заменить): отметки «исполнено» с клиента ставить нельзя.
create or replace function public.guard_wishlist_item_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.completed_by is distinct from old.completed_by then
    raise exception 'Wishlist marks are private and stored separately';
  end if;
  return new;
end;
$$;

-- 1) Настройка «партнёр видит мои отметки в вишлистах». По умолчанию выключена.
create table if not exists public.wishlist_mark_sharing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.wishlist_mark_sharing enable row level security;
drop policy if exists "Users read own sharing setting" on public.wishlist_mark_sharing;
create policy "Users read own sharing setting" on public.wishlist_mark_sharing for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add own sharing setting" on public.wishlist_mark_sharing;
create policy "Users add own sharing setting" on public.wishlist_mark_sharing for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users update own sharing setting" on public.wishlist_mark_sharing;
create policy "Users update own sharing setting" on public.wishlist_mark_sharing for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.wishlist_mark_sharing to authenticated;

-- 2) Включил ли человек показ отметок (проверка только для его партнёра по паре).
create or replace function public.shares_wishlist_marks(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select s.share from public.wishlist_mark_sharing s where s.user_id = uid), false)
    and exists (
      select 1 from public.couple_members a
      join public.couple_members b on b.couple_id = a.couple_id
      where a.user_id = uid and b.user_id = auth.uid()
    );
$$;
revoke all on function public.shares_wishlist_marks(uuid) from public;
grant execute on function public.shares_wishlist_marks(uuid) to authenticated;

-- 3) Отметки видны: самому поставившему всегда, а автору желания — только если поставивший это разрешил.
drop policy if exists "Users read own private wishlist marks" on public.wishlist_private_marks;
drop policy if exists "Read own marks or marks shared with wish owner" on public.wishlist_private_marks;
create policy "Read own marks or marks shared with wish owner" on public.wishlist_private_marks
  for select to authenticated using (
    user_id = auth.uid()
    or (
      public.shares_wishlist_marks(user_id)
      and exists (select 1 from public.wishlist_items wi where wi.id = wishlist_item_id and wi.owner_id = auth.uid())
    )
  );
