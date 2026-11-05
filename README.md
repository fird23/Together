# Together

Приватное веб-приложение для пары: регистрация, приглашение партнёра по ссылке, общая страница со счётчиком дней и трекер общих/личных привычек.

Стек: Next.js (App Router), React, TypeScript, Tailwind CSS v4, Supabase (Auth + PostgreSQL + RLS), Zod, Lucide.

Запуск и обновление: [SETUP.md](./SETUP.md). План развития: [PLAN.md](./PLAN.md).

## Структура

- `src/app` — страницы и маршруты (`(auth)`, `(onboarding)`, `(dashboard)`, `invite/[token]`)
- `src/components` — интерфейс (`ui`, `layout`, `auth`, `couple`, `providers`)
- `src/services` — обращения к Supabase (вход, пара, приглашения, профиль)
- `src/lib` — клиент Supabase, проверка данных (Zod), токены приглашений, тексты ошибок
- `src/utils` — даты, счётчик дней, ближайшие памятные даты
- `src/lib/themes.ts`, `src/app/globals.css` — темы оформления (цвета только в globals.css)
- `supabase` — `schema.sql` (установка с нуля) и `migrations`
