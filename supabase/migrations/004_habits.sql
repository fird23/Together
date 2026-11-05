-- Together: shared and personal habit tracker.
-- Run once in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('shared', 'personal')),
  title text not null check (char_length(trim(title)) between 1 and 70),
  created_at timestamptz not null default now(),
  constraint habits_scope_owner_check check (
    (scope = 'shared' and owner_id is null) or
    (scope = 'personal' and owner_id is not null)
  )
);

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, user_id, day)
);

create index if not exists habits_couple_created_idx on public.habits(couple_id, created_at desc);
create index if not exists habit_checkins_habit_day_idx on public.habit_checkins(habit_id, day desc);

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

drop policy if exists "Members can read visible habits" on public.habits;
create policy "Members can read visible habits" on public.habits
for select to authenticated using (
  public.is_couple_member(couple_id)
  and (scope = 'shared' or owner_id = auth.uid())
);

drop policy if exists "Members can create habits" on public.habits;
create policy "Members can create habits" on public.habits
for insert to authenticated with check (
  public.is_couple_member(couple_id)
  and (
    (scope = 'shared' and owner_id is null)
    or (scope = 'personal' and owner_id = auth.uid())
  )
);

drop policy if exists "Owners or couple members can delete habits" on public.habits;
create policy "Owners or couple members can delete habits" on public.habits
for delete to authenticated using (
  public.is_couple_member(couple_id)
  and (scope = 'shared' or owner_id = auth.uid())
);

drop policy if exists "Members can read visible checkins" on public.habit_checkins;
create policy "Members can read visible checkins" on public.habit_checkins
for select to authenticated using (
  exists (
    select 1 from public.habits h
    where h.id = habit_id
      and public.is_couple_member(h.couple_id)
      and (h.scope = 'shared' or h.owner_id = auth.uid())
  )
);

drop policy if exists "Users can add own checkins" on public.habit_checkins;
create policy "Users can add own checkins" on public.habit_checkins
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.habits h
    where h.id = habit_id
      and public.is_couple_member(h.couple_id)
      and (h.scope = 'shared' or h.owner_id = auth.uid())
  )
);

drop policy if exists "Users can remove own checkins" on public.habit_checkins;
create policy "Users can remove own checkins" on public.habit_checkins
for delete to authenticated using (
  user_id = auth.uid()
  and exists (
    select 1 from public.habits h
    where h.id = habit_id
      and public.is_couple_member(h.couple_id)
      and (h.scope = 'shared' or h.owner_id = auth.uid())
  )
);

grant select, insert, delete on public.habits to authenticated;
grant select, insert, delete on public.habit_checkins to authenticated;

-- Allow each member to rename a habit they can see (shared or personally owned).
drop policy if exists "Owners or couple members can update habits" on public.habits;
create policy "Owners or couple members can update habits" on public.habits
for update to authenticated using (
  public.is_couple_member(couple_id) and (scope = 'shared' or owner_id = auth.uid())
) with check (
  public.is_couple_member(couple_id) and (scope = 'shared' or owner_id = auth.uid())
);
grant update on public.habits to authenticated;
