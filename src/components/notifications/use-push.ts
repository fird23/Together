"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { isNativeApp } from "@/lib/native";
import { disableNativePush, enableNativePush, nativePushAvailable, storedToken } from "@/lib/native-push";
import { VAPID_PUBLIC_KEY, currentSubscription, needsInstallOnIos, pushSupported, showLocalTest, subscribePush, unsubscribePush, webPermission } from "@/lib/push";
import { defaultPrefs, removeSubscription, savePrefs, saveSubscription, sendTestPush, getPrefs } from "@/services/notifications";

export type PushStatus = "loading" | "on" | "off" | "denied" | "ios-install" | "unsupported" | "unconfigured" | "native-unavailable";

const CHANGED = "together:push-changed";

async function nativePermission(): Promise<string> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return (await PushNotifications.checkPermissions()).receive;
  } catch { return "prompt"; }
}

async function detect(): Promise<PushStatus> {
  if (isNativeApp()) {
    if (!(await nativePushAvailable())) return "native-unavailable";
    const permission = await nativePermission();
    if (permission === "denied") return "denied";
    return storedToken() && permission === "granted" ? "on" : "off";
  }
  if (needsInstallOnIos()) return "ios-install";
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  if (webPermission() === "denied") return "denied";
  return (await currentSubscription()) && webPermission() === "granted" ? "on" : "off";
}

/** Тексты для каждого состояния: одни и те же в кнопке шапки, на главной и в настройках. */
export function statusCopy(status: PushStatus, native: boolean): { title: string; text: string } {
  switch (status) {
    case "on": return { title: "Включены на этом устройстве", text: "У каждого устройства своя подписка: на телефоне и компьютере включайте отдельно." };
    case "off": return { title: "На этом устройстве выключены", text: "Включите, чтобы получать напоминания о привычках, особых днях и настроении партнёра." };
    case "denied": return native
      ? { title: "Уведомления запрещены", text: "Разрешите их для Together: Настройки телефона → Приложения → Together → Уведомления. Потом вернитесь и нажмите «Включить»." }
      : { title: "Уведомления запрещены в браузере", text: "Нажмите на значок замка слева от адреса сайта, в пункте «Уведомления» выберите «Разрешить» и обновите страницу." };
    case "ios-install": return { title: "Нужна установка на экран «Домой»", text: "На iPhone и iPad уведомления работают только у приложения на экране «Домой»: в Safari нажмите «Поделиться» → «На экран “Домой”», откройте Together оттуда и включите уведомления." };
    case "unsupported": return { title: "Браузер не поддерживает уведомления", text: "Откройте Together в актуальной версии Chrome, Edge, Firefox или Safari." };
    case "unconfigured": return { title: "Уведомления в браузере не подключены", text: "Нужны ключи VAPID: шаги в NOTIFICATIONS_SETUP.md. На телефоне пользуйтесь приложением для Android: уведомления включаются в нём." };
    case "native-unavailable": return { title: "В этой сборке приложения нет Firebase", text: "Подключите Firebase (google-services.json) и пересоберите приложение: шаг «Уведомления» в NOTIFICATIONS_SETUP.md." };
    default: return { title: "", text: "" };
  }
}

/** Состояние уведомлений этого устройства и действия над ним. Все экземпляры хука синхронизируются между собой. */
export function usePush() {
  const { profile } = useWorkspace();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const native = isNativeApp();

  const refresh = useCallback(async () => { setStatus(await detect()); }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); }; // разрешение могли поменять в настройках
    window.addEventListener(CHANGED, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.removeEventListener(CHANGED, onChange); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(""); setInfo("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
    window.dispatchEvent(new Event(CHANGED));
  }

  const enable = () => run(async () => {
    if (!profile) return;
    if (native) await enableNativePush(profile.id);
    else await saveSubscription(profile.id, await subscribePush());
    // Часовой пояс нужен серверу, чтобы присылать напоминания вовремя. Остальные настройки не трогаем.
    try { await savePrefs(profile.id, { ...(await getPrefs(profile.id)), timezone: defaultPrefs().timezone }); } catch { /* настройки применятся позже */ }
    setInfo("Готово: уведомления включены на этом устройстве.");
  });

  const disable = () => run(async () => {
    if (native) await disableNativePush();
    else { const endpoint = await unsubscribePush(); if (endpoint) await removeSubscription(endpoint); }
  });

  const test = () => run(async () => {
    const result = await sendTestPush();
    if (!result.configured) {
      if (!native && pushSupported() && Notification.permission === "granted") await showLocalTest();
      throw new Error("Сервер уведомлений не настроен: напоминания и пуши от партнёра приходить не будут. Выполните supabase/setup_notifications.sql (см. NOTIFICATIONS_SETUP.md).");
    }
    if (result.android + result.web === 0) throw new Error("У вас нет подключённых устройств. Включите уведомления на этом устройстве и повторите.");
    setInfo("Тест отправлен. Уведомление придёт на подключённые устройства в течение нескольких секунд. Если его нет, проверьте NOTIFICATIONS_SETUP.md, раздел «Если не приходит».");
  });

  return { status, busy, error, info, native, enable, disable, test, clearMessages: () => { setError(""); setInfo(""); } };
}
