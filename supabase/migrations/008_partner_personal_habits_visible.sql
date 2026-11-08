-- Personal habits are visible to both members, but only their owner can edit/check them.
drop policy if exists "Members can read visible habits" on public.habits;
create policy "Members can read visible habits" on public.habits
for select to authenticated using (public.is_couple_member(couple_id));

drop policy if exists "Members can read visible checkins" on public.habit_checkins;
create policy "Members can read visible checkins" on public.habit_checkins
for select to authenticated using (
  exists (
    select 1 from public.habits h
    where h.id = habit_id and public.is_couple_member(h.couple_id)
  )
);
