# Together

Приватное веб-приложение для пары. Один человек создаёт пару и отправляет партнёру ссылку-приглашение, после чего у двоих появляется общее пространство: счётчик «Мы вместе уже», календарь, привычки, настроение, дела, разговоры, благодарности, вишлисты, фотоальбом, воспоминания, итоги недели и уведомления.

Стек: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (Auth, PostgreSQL с RLS, Storage, Realtime, Edge Functions), Zod, Lucide, dnd-kit. Для Android есть оболочка на Capacitor.

Запуск и обновление: [SETUP.md](./SETUP.md). Уведомления: [NOTIFICATIONS_SETUP.md](./NOTIFICATIONS_SETUP.md). Поддержка и Telegram: [SUPPORT_SETUP.md](./SUPPORT_SETUP.md). Android: [NATIVE_SETUP.md](./NATIVE_SETUP.md). План развития: [PLAN.md](./PLAN.md).

## Структура

- `src/app`: страницы и маршруты (`(auth)`, `(onboarding)`, `(dashboard)`, `invite/[token]`, `admin`)
- `src/components`: интерфейс по разделам (`couple`, `habits`, `mood`, `todos`, `talk`, `wishlist`, `album`, `notifications`, `support`, `admin`, `ui`, `layout`, `providers`, `native`)
- `src/services`: все обращения к Supabase (вход, пара, привычки, настроение, вишлисты, итоги, календарь, дела и др.)
- `src/hooks`: общие хуки (`use-realtime` с общими каналами, `use-load` для загрузки данных)
- `src/lib`: клиент Supabase, постраничное чтение (`paged.ts`), временные ссылки на фото (`signed-urls.ts`), темы, настроения (`moods.ts`)
- `src/utils`: чистая логика без доступа к сети (даты, серии привычек, календарь); для неё есть тесты
- `supabase`: `schema.sql` (основа), `migrations` (всё остальное, по порядку), `functions` (`push-notify`, `support-notify`)
- `android`: оболочка Capacitor, виджет, смена иконки

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | запуск для разработки |
| `npm run typecheck` | проверка типов |
| `npm run lint` | линтер |
| `npm test` | тесты (vitest) |
| `npm run sync:moods` | переносит список настроений из `src/lib/moods.ts` в функцию уведомлений |
| `npm run check:moods` | проверяет, что список в функции актуален |

При каждом пуше на GitHub автоматически запускаются типы, линтер, тесты и проверка списка настроений (`.github/workflows/ci.yml`).

## Правила проекта

- Запросы к базе пишутся в `src/services`, а не в компонентах.
- Загрузка данных в компоненте: `useLoad(load)`, а не `useEffect(() => { void load(); }, [load])`.
- Настроения меняются только в `src/lib/moods.ts`; после этого выполните `npm run sync:moods`.
- Любое чтение таблиц, которые могут вырасти (отметки, настроение), идёт через `fetchAllRows` из `src/lib/paged.ts`: Supabase молча обрезает ответ на 1000 строках.
