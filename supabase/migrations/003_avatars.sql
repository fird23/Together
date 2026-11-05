-- Together: миграция 003 — аватары.
-- Запустите один раз: Supabase Dashboard -> SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно.

-- 1. Хранилище. Бакет публичный (картинки открываются по ссылке без входа),
--    но писать в него можно только в собственную папку, а размер и тип ограничены.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Политики. Загружать можно только файл строго вида "<мой id>/<имя>.jpg|png|webp":
--    никаких вложенных папок и «..» в пути. Читать и удалять — только в своей папке.
drop policy if exists "Users read own avatar files" on storage.objects;
create policy "Users read own avatar files" on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload own avatar files" on storage.objects;
create policy "Users upload own avatar files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

drop policy if exists "Users update own avatar files" on storage.objects;
create policy "Users update own avatar files" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (
  bucket_id = 'avatars'
  and name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

drop policy if exists "Users delete own avatar files" on storage.objects;
create policy "Users delete own avatar files" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. В profiles.avatar_url хранится ТОЛЬКО путь вида "<id пользователя>/<имя>.jpg".
--    Так в профиль нельзя записать внешнюю ссылку (иначе она загружалась бы
--    в браузере партнёра и выдавала бы его IP-адрес).
alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles add constraint profiles_avatar_path_check
  check (avatar_url is null or avatar_url ~ ('^' || id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'));
