-- Streak freeze: a missed day can be "frozen" so it does not break the streak. Up to 3 per habit per month.
create table if not exists public.habit_freezes (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, user_id, day)
);
create index if not exists habit_freezes_habit_day_idx on public.habit_freezes(habit_id, day desc);
alter table public.habit_freezes enable row level security;

drop policy if exists "Members read freezes" on public.habit_freezes;
create policy "Members read freezes" on public.habit_freezes for select to authenticated using (
  exists (select 1 from public.habits h where h.id = habit_id and public.is_couple_member(h.couple_id)));
drop policy if exists "Users freeze own days" on public.habit_freezes;
create policy "Users freeze own days" on public.habit_freezes for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.habits h where h.id = habit_id and public.is_couple_member(h.couple_id)
      and (h.scope = 'shared' or h.owner_id = auth.uid())));
drop policy if exists "Users unfreeze own days" on public.habit_freezes;
create policy "Users unfreeze own days" on public.habit_freezes for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.habit_freezes to authenticated;

create or replace function public.limit_habit_freezes()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.day < current_date - 2 or new.day > current_date + 1 then
    raise exception 'Заморозить можно только сегодняшний или вчерашний день.';
  end if;
  if (select count(*) from public.habit_freezes
      where habit_id = new.habit_id and user_id = new.user_id
        and date_trunc('month', day) = date_trunc('month', new.day)) >= 3 then
    raise exception 'В этом месяце заморозки для привычки закончились (3 из 3).';
  end if;
  return new;
end;
$$;
drop trigger if exists habit_freezes_limit on public.habit_freezes;
create trigger habit_freezes_limit before insert on public.habit_freezes for each row execute function public.limit_habit_freezes();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'habit_freezes') then
    alter publication supabase_realtime add table public.habit_freezes;
  end if;
end $$;
