-- Исправление сохранения привычек: гарантируем наличие всех полей редактора и политики UPDATE.
-- Безопасно выполнять повторно в Supabase SQL Editor.
alter table public.habits add column if not exists color text
  check (color is null or color in ('rose','amber','green','blue','violet','orange','teal','gray'));
alter table public.habits add column if not exists icon text
  check (icon is null or char_length(icon) <= 24);
alter table public.habits add column if not exists week_days smallint[]
  check (week_days is null or (array_length(week_days, 1) between 1 and 7 and week_days <@ array[1,2,3,4,5,6,7]::smallint[]));
alter table public.habits add column if not exists per_week smallint
  check (per_week is null or per_week between 1 and 7);
alter table public.habits add column if not exists target_value numeric
  check (target_value is null or (target_value > 0 and target_value <= 1000000));
alter table public.habits add column if not exists unit text
  check (unit is null or char_length(unit) <= 16);

alter table public.habits drop constraint if exists habits_schedule_one;
alter table public.habits add constraint habits_schedule_one
  check (week_days is null or per_week is null);

drop policy if exists "Owners or couple members can update habits" on public.habits;
create policy "Owners or couple members can update habits" on public.habits
for update to authenticated
using (public.is_couple_member(couple_id) and (scope = 'shared' or owner_id = auth.uid()))
with check (public.is_couple_member(couple_id) and (scope = 'shared' or owner_id = auth.uid()));

grant select, insert, update, delete on public.habits to authenticated;
