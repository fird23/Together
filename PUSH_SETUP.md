# Push-уведомления: настройка (≈15 минут)

Код приложения готов: service worker (`public/sw.js`), установка на экран телефона (`manifest`), раздел
«Настройки → Уведомления». Осталось подключить сервер, который отправляет уведомления.

1. **Ключи VAPID:** `npx web-push generate-vapid-keys`
2. **Публичный ключ в приложение:** `.env.local` (и переменные Vercel) → `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`, затем пересоберите сайт.
3. **Миграция:** `013_features_and_push.sql` в SQL Editor.
4. **Функция:**
   `supabase functions deploy push-notify --no-verify-jwt`
   `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:вы@почта WEBHOOK_SECRET=придумайте_строку`
5. **Расписание (раз в час)** — SQL Editor (нужны расширения `pg_cron` и `pg_net`: Database → Extensions):
   ```sql
   select cron.schedule('push-hourly', '0 * * * *', $$
     select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-notify',
       headers := '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}'::jsonb,
       body := '{"type":"cron"}'::jsonb);
   $$);
   ```
6. **События** — Database → Webhooks → Create (оба на функцию `push-notify`, заголовок `x-webhook-secret`):
   - таблица `mood_entries`, события INSERT и UPDATE;
   - таблица `habit_checkins`, событие INSERT.

## Важно знать
- Android (Chrome): работает сразу. iPhone: только iOS 16.4+ и только если сайт добавлен на экран «Домой».
- Нужен HTTPS (на Vercel он есть).
- Напоминания о привычках приходят в выбранный час, а даты и события календаря — в 9:00 по времени пользователя.
