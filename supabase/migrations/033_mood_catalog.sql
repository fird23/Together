-- Больше настроений: список допустимых значений теперь задаёт приложение (каталог эмоций),
-- а база проверяет только формат идентификатора. Новые эмоции больше не требуют миграций.
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

alter table public.mood_entries drop constraint if exists mood_entries_mood_check;
alter table public.mood_entries add constraint mood_entries_mood_check check (mood ~ '^[a-z][a-z_]{1,23}$');
