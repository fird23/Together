# Together — запуск MVP

## 1. Создать Supabase-проект

1. Открой https://supabase.com/dashboard и создай проект.
2. Открой **Project Settings → API** (в некоторых версиях панели — **Data API / API Keys**).
3. Скопируй Project URL и anon/publishable key.
4. В корне проекта создай файл `.env.local` (рядом с `package.json`) и добавь:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Не используй `service_role` или `secret` key в переменной `NEXT_PUBLIC_*`.

## 2. Создать таблицы и функции

1. В Supabase открой **SQL Editor → New query**.
2. Открой файл `supabase/schema.sql` из проекта.
3. Скопируй весь SQL в редактор и нажми **Run**.

## 3. Настроить подтверждение email

В Supabase открой **Authentication → URL Configuration**.
Для локальной разработки добавь `http://localhost:3000` в Site URL / Redirect URLs.
Для production после публикации добавь адрес сайта Vercel, например `https://your-project.vercel.app`.

Для первого теста можно временно отключить подтверждение email в **Authentication → Providers → Email → Confirm email**. Перед публичным запуском включи подтверждение email и настрой SMTP, если требуется.

## 4. Запуск

Из папки, где находится `package.json`:

```bash
npm install
npm run dev
```

Открой http://localhost:3000.

## 5. Проверка сценария пары

1. Зарегистрируй аккаунт A.
2. Если включено подтверждение email — подтверди почту и войди.
3. Создай пару и скопируй ссылку-приглашение.
4. Открой ссылку в другом браузере или режиме инкогнито.
5. Зарегистрируй аккаунт B и подтверди почту, если это требуется.
6. После входа приложение должно принять приглашение и показать пару обоим пользователям.

## 6. Публикация на Vercel

1. Загрузи проект в GitHub.
2. Импортируй репозиторий на https://vercel.com/new.
3. В Vercel → Project Settings → Environment Variables добавь обе переменные из `.env.local`.
4. В Supabase добавь домен Vercel в Authentication → URL Configuration.
5. Сделай Redeploy.

## Что реализовано сейчас

- Регистрация, вход, выход, восстановление пароля через Supabase Auth.
- Профиль с редактированием имени.
- Создание пары и одноразовая ссылка-приглашение на 7 дней.
- Принятие приглашения вторым аккаунтом.
- Счётчик дней от даты отношений.
- Редактирование даты отношений.
- RLS-политики для изоляции данных пары.

Загрузка аватаров, галерея, календарь и воспоминания пока не входят в MVP.
