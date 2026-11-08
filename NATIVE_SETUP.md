# Together для Android: сборка и уведомления

## 1. Сборка приложения
Все команды выполняйте в папке проекта, где лежит файл `package.json`.

1. Откройте файл `server-url.txt`, впишите адрес сайта на Vercel (одной строкой, с `https://`), сохраните.
2. В терминале:
   ```
   npm install
   npm run cap:sync
   ```
   Если `cap:sync` пишет «could not determine executable», значит `npm install` не отработал или вы не в той папке.
3. Откройте папку `android` в Android Studio и соберите APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   Файл: `android/app/build/outputs/apk/debug/app-debug.apk`. Установите его поверх старого.

## 2. Уведомления на телефон (Firebase)
**Firebase** (бесплатно):
1. console.firebase.google.com → создать проект → значок Android → имя пакета `com.together.app` → скачать `google-services.json`
   и положить в `android/app/`.
2. ⚙ Настройки проекта → «Сервисные аккаунты» → «Сгенерировать новый закрытый ключ» (скачается `.json`, храните его в секрете).

**Supabase:**
1. SQL Editor: выполните миграции `017_habit_style_schedule.sql` и `018_device_tokens.sql`.
2. Edge Functions → Deploy a new function → **Via Editor** → имя `push-notify` → вставьте всё из файла
   `supabase/functions/push-notify/index.ts` → Deploy. Затем в настройках функции **выключите «Verify JWT»**.
3. Edge Functions → Secrets → добавьте два секрета:
   - `FIREBASE_SERVICE_ACCOUNT` — всё содержимое скачанного ключа `.json`;
   - `WEBHOOK_SECRET` — любая длинная строка (придумайте сами).
4. SQL Editor: откройте `supabase/setup_notifications.sql`, замените `ВАШ-ПРОЕКТ` и `ВАШ_СЕКРЕТ` (тот же, что в `WEBHOOK_SECRET`)
   и выполните. Это включает расписание и уведомления о действиях партнёра.

**Приложение:** выполните `npm run cap:sync`, соберите APK заново и установите. Затем в приложении: Настройки → Уведомления → «Включить».

## 3. Виджет
Настройки → Приложение → «Добавить виджет» (или удерживайте пустое место на главном экране → Виджеты → Together).
Число дней обновляется само, привычки и событие обновляются при открытии приложения.

## 4. Выпуск в Google Play (когда понадобится)
Создайте ключ подписи (`keytool -genkey -v -keystore together.jks -keyalg RSA -keysize 2048 -validity 10000 -alias together`),
затем в Android Studio: **Build → Generate Signed Bundle**. Разовый взнос Google Play — $25.

## Проверка уведомлений
В SQL Editor:
```sql
select public.notify_push('{"type":"test"}'::jsonb);
-- через несколько секунд: статус ответа функции (200 = всё хорошо)
select id, status_code, content, error_msg from net._http_response order by created desc limit 3;
```
На подключённые устройства придёт «Проверка уведомлений». Журнал вызовов функции: Edge Functions → push-notify → вкладка **Invocations**
(вкладка Logs показывает только ошибки, поэтому при успешной работе она пустая).
