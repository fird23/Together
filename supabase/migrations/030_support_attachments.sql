-- Фото в обращениях в поддержку (до 5 штук). Автор видит свои файлы, администратор видит файлы обращений.
-- Требует миграцию 025_admin_panel.sql (функция is_admin).
alter table public.support_tickets
  add column if not exists attachments text[] not null default '{}';
alter table public.support_tickets drop constraint if exists support_tickets_attachments_max;
alter table public.support_tickets
  add constraint support_tickets_attachments_max check (cardinality(attachments) <= 5);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-media', 'support-media', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

-- Файлы лежат в папке с идентификатором автора: <user_id>/<файл>.jpg
drop policy if exists "Users upload support media" on storage.objects;
create policy "Users upload support media" on storage.objects for insert to authenticated
  with check (bucket_id = 'support-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users and admins read support media" on storage.objects;
create policy "Users and admins read support media" on storage.objects for select to authenticated
  using (bucket_id = 'support-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Users delete own support media" on storage.objects;
create policy "Users delete own support media" on storage.objects for delete to authenticated
  using (bucket_id = 'support-media' and (storage.foldername(name))[1] = auth.uid()::text);
