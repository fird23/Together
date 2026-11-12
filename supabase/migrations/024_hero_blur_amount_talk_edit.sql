-- 1) Регулировка размытия фото на карточке «Мы вместе уже»: сила в пикселях (0 = без размытия).
--    Пока пусто, используется прежний переключатель hero_photo_blur.
alter table public.couples add column if not exists hero_photo_blur_amount smallint
  check (hero_photo_blur_amount is null or hero_photo_blur_amount between 0 and 24);

-- 2) Редактирование сообщений в «Разговорах»: автор может изменить свой текст, рядом показывается «изменено».
alter table public.talk_threads add column if not exists edited_at timestamptz;
alter table public.talk_replies add column if not exists edited_at timestamptz;
-- Для обращений право править уже есть («Authors edit threads»). Для ответов добавляем.
drop policy if exists "Authors edit replies" on public.talk_replies;
create policy "Authors edit replies" on public.talk_replies for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
grant update on public.talk_replies to authenticated;
