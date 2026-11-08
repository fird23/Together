import { AppError } from "@/lib/errors";
import { db } from "@/lib/supabase";
import { TogetherNative } from "@/lib/native";

export const TOKEN_KEY = "together-fcm-token";

export const storedToken = () => { try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const rememberToken = (token: string | null) => {
  try { if (token) window.localStorage.setItem(TOKEN_KEY, token); else window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

/** Подключён ли Firebase в этой сборке приложения (есть ли google-services.json). */
export async function nativePushAvailable(): Promise<boolean> {
  try { return (await TogetherNative.isPushAvailable()).available; } catch { return false; }
}

async function saveToken(userId: string, token: string) {
  const { error } = await db().from("device_tokens").upsert({ user_id: userId, token, platform: "android" }, { onConflict: "token" });
  if (error) throw new AppError("Не удалось сохранить устройство. Примените миграцию 018_device_tokens.sql.");
}

/** Запрашивает разрешение, получает FCM-токен и сохраняет его для сервера. */
export async function enableNativePush(userId: string): Promise<void> {
  if (!(await nativePushAvailable())) throw new AppError("В этой сборке приложения не подключён Firebase. См. NATIVE_SETUP.md.");
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") throw new AppError("Разрешение не выдано. Включите уведомления для Together в настройках телефона.");

  const handles: { remove: () => Promise<void> }[] = [];
  try {
    const token = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new AppError("Не удалось получить токен. Проверьте интернет и повторите.")), 15000);
      void (async () => {
        handles.push(await PushNotifications.addListener("registration", (t) => { clearTimeout(timer); resolve(t.value); }));
        handles.push(await PushNotifications.addListener("registrationError", () => { clearTimeout(timer); reject(new AppError("Не удалось зарегистрировать устройство в Firebase.")); }));
        await PushNotifications.register();
      })().catch((e) => { clearTimeout(timer); reject(e); });
    });
    await saveToken(userId, token);
    rememberToken(token);
  } finally {
    await Promise.all(handles.map((h) => h.remove().catch(() => {})));
  }
}

export async function disableNativePush(): Promise<void> {
  const token = storedToken();
  if (token) {
    const { error } = await db().from("device_tokens").delete().eq("token", token);
    if (error) throw new AppError("Не удалось отключить уведомления. Попробуйте ещё раз.");
  }
  rememberToken(null);
  try { const { PushNotifications } = await import("@capacitor/push-notifications"); await PushNotifications.unregister(); } catch { /* ignore */ }
}

/** При каждом запуске обновляет токен: Firebase иногда его меняет. */
export async function refreshNativeToken(userId: string): Promise<void> {
  if (!storedToken() || !(await nativePushAvailable())) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") return;
  const handle = await PushNotifications.addListener("registration", (t) => {
    void saveToken(userId, t.value).then(() => rememberToken(t.value)).catch(() => {});
    void handle.remove();
  });
  await PushNotifications.register();
}
