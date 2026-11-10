-- 1) Ещё три настроения: «Влюблён», «Скучаю», «Игривый». Старые значения (в том числе 'good') остаются допустимыми.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.mood_entries'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%great%'
  loop
    execute format('alter table public.mood_entries drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.mood_entries add constraint mood_entries_mood_check
  check (mood in ('great','good','angry','calm','tired','sad','stressed','love','miss','playful'));

-- 2) Привычки с числовой нормой: 5000 шагов, 2 км, 2 л воды, 30 отжиманий.
alter table public.habits add column if not exists target_value numeric
  check (target_value is null or (target_value > 0 and target_value <= 1000000));
alter table public.habits add column if not exists unit text
  check (unit is null or char_length(unit) <= 16);

-- Сколько сделано за день. Отметка «выполнено» (habit_checkins) ставится и снимается автоматически по этому числу,
-- поэтому серии, статистика и уведомления работают так же, как у привычек-галочек.
create table if not exists public.habit_progress (
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  value numeric not null check (value > 0 and value <= 100000000),
  updated_at timestamptz not null default now(),
  primary key (habit_id, user_id, day)
);
create index if not exists habit_progress_habit_day_idx on public.habit_progress(habit_id, day desc);
alter table public.habit_progress enable row level security;

drop policy if exists "Members can read visible progress" on public.habit_progress;
create policy "Members can read visible progress" on public.habit_progress
for select to authenticated using (
  exists (select 1 from public.habits h where h.id = habit_id and public.is_couple_member(h.couple_id) and (h.scope = 'shared' or h.owner_id = auth.uid()))
);
drop policy if exists "Users can add own progress" on public.habit_progress;
create policy "Users can add own progress" on public.habit_progress
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.habits h where h.id = habit_id and public.is_couple_member(h.couple_id) and (h.scope = 'shared' or h.owner_id = auth.uid()))
);
drop policy if exists "Users can update own progress" on public.habit_progress;
create policy "Users can update own progress" on public.habit_progress
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can remove own progress" on public.habit_progress;
create policy "Users can remove own progress" on public.habit_progress
for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.habit_progress to authenticated;

-- Записывает число за день и сразу ставит или снимает отметку «выполнено». Возвращает true, если норма выполнена.
create or replace function public.set_habit_progress(p_habit uuid, p_day date, p_value numeric)
returns boolean language plpgsql security invoker set search_path = public as $$
declare
  t numeric;
  v numeric := greatest(coalesce(p_value, 0), 0);
  reached boolean;
begin
  select target_value into t from public.habits where id = p_habit;
  if t is null then raise exception 'Habit not found or has no numeric target'; end if;
  if p_day > current_date + 1 then raise exception 'Cannot record progress in the future'; end if;

  if v = 0 then
    delete from public.habit_progress where habit_id = p_habit and user_id = auth.uid() and day = p_day;
  else
    insert into public.habit_progress (habit_id, user_id, day, value) values (p_habit, auth.uid(), p_day, v)
    on conflict (habit_id, user_id, day) do update set value = excluded.value, updated_at = now();
  end if;

  reached := v >= t;
  if reached then
    insert into public.habit_checkins (habit_id, user_id, day) values (p_habit, auth.uid(), p_day)
    on conflict (habit_id, user_id, day) do nothing;
  else
    delete from public.habit_checkins where habit_id = p_habit and user_id = auth.uid() and day = p_day;
  end if;
  return reached;
end;
$$;
revoke all on function public.set_habit_progress(uuid, date, numeric) from public;
grant execute on function public.set_habit_progress(uuid, date, numeric) to authenticated;

-- Чтобы у партнёра прогресс обновлялся без перезагрузки.
do $$ begin
  alter publication supabase_realtime add table public.habit_progress;
exception when duplicate_object then null; when undefined_object then null;
end $$;
