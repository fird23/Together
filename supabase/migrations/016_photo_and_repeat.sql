-- 1) Repeating calendar marks.
alter table public.calendar_events
  add column if not exists repeat text not null default 'none' check (repeat in ('none','weekly','monthly','yearly'));

-- 2) Couple photo on the "Together for N days" card (+ blur on/off). Shared by both partners.
alter table public.couples add column if not exists hero_photo_path text;
alter table public.couples add column if not exists hero_photo_blur boolean not null default true;

-- 3) Private storage bucket: files live under "<couple_id>/...", only members of that couple can access them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-photos', 'couple-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "Couple members read photos" on storage.objects;
create policy "Couple members read photos" on storage.objects for select to authenticated using (
  bucket_id = 'couple-photos' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members upload photos" on storage.objects;
create policy "Couple members upload photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'couple-photos' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
drop policy if exists "Couple members delete photos" on storage.objects;
create policy "Couple members delete photos" on storage.objects for delete to authenticated using (
  bucket_id = 'couple-photos' and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then public.is_couple_member(((storage.foldername(name))[1])::uuid) else false end);
