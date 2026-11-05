# Куда приходят обращения из «Поддержки»

Все обращения сохраняются в таблицу `support_tickets` (миграция 011). Читать их и отвечать можно
в Supabase → Table Editor → `support_tickets`: поменяйте `status` и впишите ответ в `admin_reply`,
пользователь увидит его на странице «Поддержка».

## Уведомление в Telegram (по желанию, ~10 минут)
1. В Telegram напишите @BotFather → `/newbot`, получите токен.
2. Напишите своему боту любое сообщение, откройте `https://api.telegram.org/bot<TOKEN>/getUpdates` и найдите `chat.id`.
3. Supabase CLI: `supabase functions deploy support-notify --no-verify-jwt`
4. `supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... WEBHOOK_SECRET=придумайте_строку`
5. Dashboard → Database → Webhooks → Create: таблица `support_tickets`, событие `INSERT`, тип «Supabase Edge Functions»,
   функция `support-notify`, HTTP-заголовок `x-webhook-secret` = ваша строка.
