import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { NotificationPrefs } from "@/types";

const HINT = "Уведомления не готовы: примените миграцию 013_features_and_push.sql.";

export const defaultPrefs = (): NotificationPrefs => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  habits: true, habits_hour: 20, dates: true, events: true, partner_mood: true, partner_habits: false,
});

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await db().from("notification_prefs").select("timezone,habits,habits_hour,dates,events,partner_mood,partner_habits").eq("user_id", userId).maybeSingle();
  if (error) throw new AppError(HINT);
  return { ...defaultPrefs(), ...(data ?? {}) } as NotificationPrefs;
}

export async function savePrefs(userId: string, prefs: NotificationPrefs) {
  const { error } = await db().from("notification_prefs").upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new AppError(HINT);
}

export async function saveSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new AppError("Не удалось подписаться на уведомления.");
  const { error } = await db().from("push_subscriptions").upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) throw dbError(error);
}

export async function removeSubscription(endpoint: string) {
  const { error } = await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw dbError(error);
}

export type TestPushResult = { configured: boolean; android: number; web: number };

/** Ставит тестовый пуш в очередь на сервере (только для текущего пользователя). */
export async function sendTestPush(): Promise<TestPushResult> {
  const { data, error } = await db().rpc("send_test_push");
  if (error) throw new AppError("Проверка недоступна: примените миграцию 027_push_test.sql.");
  return data as TestPushResult;
}
