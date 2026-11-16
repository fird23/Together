-- Видео в альбоме (до 20 МБ), WebP-фото и учёт размера файлов для админ-панели.
alter table public.album_photos add column if not exists kind text not null default 'photo';
alter table public.album_photos drop constraint if exists album_photos_kind_check;
alter table public.album_photos add constraint album_photos_kind_check check (kind in ('photo', 'video'));
alter table public.album_photos add column if not exists duration_sec numeric;
alter table public.album_photos add column if not exists size_bytes bigint;

-- Хранилище альбома: до 20 МБ на файл, фото (JPEG и WebP) и видео.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/webp','video/mp4','video/webm','video/quicktime']
where id = 'album-media';
