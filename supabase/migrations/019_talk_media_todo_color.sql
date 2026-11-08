-- Small photos in "Talks" (private bucket, compressed on the phone to ~400 KB) and colors for to-do items.
alter table public.talk_threads add column if not exists media_path text;
alter table public.talk_replies add column if not exists media_path text;
alter table public.todos add column if not exists color text
  check (color is null or color in ('rose','amber','green','blue','violet','orange','teal','gray'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talk-media', 'talk-media', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "Couple members read talk media" on storage.objects;
create policy "Couple members read talk media" on storage.objects for select to authenticated using (
  bucket_id = 'talk-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members upload talk media" on storage.objects;
create policy "Couple members upload talk media" on storage.objects for insert to authenticated with check (
  bucket_id = 'talk-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members delete talk media" on storage.objects;
create policy "Couple members delete talk media" on storage.objects for delete to authenticated using (
  bucket_id = 'talk-media' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
