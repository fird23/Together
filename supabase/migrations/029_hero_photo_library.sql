-- Библиотека фото для карточки «Мы вместе уже»: старые фото больше не удаляются при замене,
-- их можно выбрать снова. Фото можно временно отключить: остаётся узор, а файл сохраняется.
create table if not exists public.hero_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  path text not null unique,
  thumb_path text,
  created_at timestamptz not null default now()
);
create index if not exists hero_photos_couple_idx on public.hero_photos(couple_id, created_at desc);
alter table public.hero_photos enable row level security;

drop policy if exists "Couple members read hero photos" on public.hero_photos;
create policy "Couple members read hero photos" on public.hero_photos for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Couple members add hero photos" on public.hero_photos;
create policy "Couple members add hero photos" on public.hero_photos for insert to authenticated
  with check (public.is_couple_member(couple_id) and uploaded_by = auth.uid());
drop policy if exists "Couple members delete hero photos" on public.hero_photos;
create policy "Couple members delete hero photos" on public.hero_photos for delete to authenticated using (public.is_couple_member(couple_id));
revoke all on public.hero_photos from anon, authenticated;
grant select, insert, delete on public.hero_photos to authenticated;

alter table public.couples add column if not exists hero_photo_enabled boolean not null default true;

-- Фото, которое сейчас стоит на карточке, попадает в библиотеку (автор неизвестен).
insert into public.hero_photos (couple_id, path)
select id, hero_photo_path from public.couples where hero_photo_path is not null
on conflict (path) do nothing;
