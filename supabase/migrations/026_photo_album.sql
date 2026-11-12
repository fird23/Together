-- Общий фотоальбом пары: таблица, закрытое хранилище (оригинал + миниатюра), realtime.

create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  thumb_path text not null,
  caption text check (caption is null or char_length(caption) <= 300),
  taken_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists album_photos_couple_idx on public.album_photos(couple_id, taken_on desc, created_at desc);
alter table public.album_photos enable row level security;

drop policy if exists "Couple members read album" on public.album_photos;
create policy "Couple members read album" on public.album_photos
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Couple members add photos" on public.album_photos;
create policy "Couple members add photos" on public.album_photos
  for insert to authenticated with check (public.is_couple_member(couple_id) and uploaded_by = auth.uid());
drop policy if exists "Couple members edit photos" on public.album_photos;
create policy "Couple members edit photos" on public.album_photos
  for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Couple members delete photos" on public.album_photos;
create policy "Couple members delete photos" on public.album_photos
  for delete to authenticated using (public.is_couple_member(couple_id));

grant select, insert, delete on public.album_photos to authenticated;
-- Менять можно только подпись и дату, но не владельца и не путь к файлу.
grant update (caption, taken_on) on public.album_photos to authenticated;

-- Закрытый бакет: фото сжимаются в браузере (до ~1,5 МБ, миниатюра ~100 КБ).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album-media', 'album-media', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "Couple members read album media" on storage.objects;
create policy "Couple members read album media" on storage.objects for select to authenticated using (
  bucket_id = 'album-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members upload album media" on storage.objects;
create policy "Couple members upload album media" on storage.objects for insert to authenticated with check (
  bucket_id = 'album-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members delete album media" on storage.objects;
create policy "Couple members delete album media" on storage.objects for delete to authenticated using (
  bucket_id = 'album-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);

-- Realtime: фото партнёра появляются без перезагрузки.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'album_photos') then
    alter publication supabase_realtime add table public.album_photos;
  end if;
end $$;
