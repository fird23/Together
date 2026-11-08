"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { TogetherNative, isNativeApp } from "@/lib/native";
import { nativePushAvailable, refreshNativeToken } from "@/lib/native-push";
import { buildWidgetSummary } from "@/lib/widget-summary";

/**
 * Работает только внутри Android-приложения:
 *  • отправляет сводку виджету (при запуске, возврате в приложение и изменениях у пары);
 *  • обновляет токен push-уведомлений;
 *  • по нажатию на уведомление открывает нужную страницу.
 */
export function NativeSync() {
  const { couple, profile, partner } = useWorkspace();
  const router = useRouter();
  const native = isNativeApp();
  const profileId = profile?.id;

  const sync = useCallback(async () => {
    if (!isNativeApp() || !couple || !profile) return;
    try {
      const summary = await buildWidgetSummary(couple, profile, partner);
      await TogetherNative.setWidgetData({ json: JSON.stringify(summary) });
    } catch { /* старая сборка без плагина или нет сети: виджет покажет прошлые данные */ }
  }, [couple, profile, partner]);

  useEffect(() => {
    if (!native) return;
    void sync();
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void sync(), 10 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(timer); };
  }, [native, sync]);

  const live = native && Boolean(couple);
  useRealtime("habit_checkins", sync, { enabled: live });
  useRealtime("habits", sync, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: live });
  useRealtime("calendar_events", sync, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: live });

  useEffect(() => {
    if (native && profileId) void refreshNativeToken(profileId).catch(() => {});
  }, [native, profileId]);

  useEffect(() => {
    if (!native) return;
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;
    (async () => {
      if (!(await nativePushAvailable())) return;
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const h = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url;
        if (typeof url === "string" && url.startsWith("/")) router.push(url);
      });
      if (cancelled) void h.remove(); else handle = h;
    })().catch(() => {});
    return () => { cancelled = true; void handle?.remove(); };
  }, [native, router]);

  return null;
}
