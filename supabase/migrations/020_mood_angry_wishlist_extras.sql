-- 1) Настроение «Злой» вместо «Хорошо». Старое значение 'good' остаётся допустимым, чтобы не терять историю.
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
  check (mood in ('great','good','angry','calm','tired','sad','stressed'));

-- 2) Вишлисты: ссылка и фото (фото лежит в закрытом бакете talk-media, в папке пары).
alter table public.wishlist_items add column if not exists link text
  check (link is null or char_length(link) <= 500);
alter table public.wishlist_items add column if not exists media_path text;
-- Права на правку желаний уже ограничены политикой «только автор» (миграция 009), новые поля её не меняют.
