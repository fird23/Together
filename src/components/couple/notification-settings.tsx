"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { isNativeApp } from "@/lib/native";
import { disableNativePush, enableNativePush, nativePushAvailable, storedToken } from "@/lib/native-push";
import { VAPID_PUBLIC_KEY, currentSubscription, needsInstallOnIos, pushSupported, showLocalTest, subscribePush, unsubscribePush } from "@/lib/push";
import { defaultPrefs, getPrefs, removeSubscription, savePrefs, saveSubscription } from "@/services/notifications";
import { featureOn } from "@/utils/features";
import type { NotificationPrefs } from "@/types";

const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00–23:00

/** Включение push на этом устройстве и выбор, о чём напоминать. */
export function NotificationSettings() {
  const { profile, couple } = useWorkspace();
  const [supported, setSupported] = useState(true);
  const [iosHint, setIosHint] = useState(false);
  const [native, setNative] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const init = useCallback(async () => {
    if (!profile) return;
    const ok = pushSupported();
    setNative(isNativeApp());
    setSupported(ok);
    setIosHint(needsInstallOnIos());
    if (isNativeApp()) { setNativeReady(await nativePushAvailable()); setSubscribed(Boolean(storedToken())); }
    else if (ok) setSubscribed(Boolean(await currentSubscription()) && Notification.permission === "granted");
    try { setPrefs(await getPrefs(profile.id)); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [profile]);
  useEffect(() => { void init(); }, [init]);

  if (!profile) return null;
  const habitsOn = featureOn(couple, "habits");

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(""); setInfo("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  const enable = () => run(async () => {
    if (native) await enableNativePush(profile.id);
    else await saveSubscription(profile.id, await subscribePush());
    await savePrefs(profile.id, { ...prefs, timezone: defaultPrefs().timezone });
    setSubscribed(true);
    setInfo("Готово: уведомления включены на этом устройстве.");
  });

  const disable = () => run(async () => {
    if (native) await disableNativePush();
    else { const endpoint = await unsubscribePush(); if (endpoint) await removeSubscription(endpoint); }
    setSubscribed(false);
  });

  const change = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch, timezone: defaultPrefs().timezone };
    setPrefs(next);
    void savePrefs(profile.id, next).catch((e) => setError(e instanceof Error ? e.message : GENERIC_ERROR));
  };

  const rows: { key: keyof NotificationPrefs; title: string; text: string; hidden?: boolean }[] = [
    { key: "habits", title: "Привычки", text: "Напомним вечером, если останутся неотмеченные привычки.", hidden: !habitsOn },
    { key: "dates", title: "Особенные дни", text: "100 дней вместе, полгода, годовщины: в 9:00 в этот день." },
    { key: "events", title: "События календаря", text: "Утром в день, когда у вас стоит пометка." },
    { key: "partner_mood", title: "Настроение партнёра", text: "Когда партнёр отметил, как он себя чувствует." },
    { key: "partner_habits", title: "Привычки партнёра", text: "Когда партнёр отметил выполнение привычки.", hidden: !habitsOn },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-milk p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${subscribed ? "bg-accent-600 text-on-accent" : "bg-sand-200 text-ink-soft"}`}>
            {subscribed ? <BellRing className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}
          </span>
          <div>
            <p className="font-semibold">{subscribed ? "Включены на этом устройстве" : "На этом устройстве выключены"}</p>
            <p className="text-sm text-ink-soft">У каждого устройства своя подписка: на телефоне и компьютере включайте отдельно.</p>
          </div>
        </div>
        {((supported && !native && VAPID_PUBLIC_KEY) || (native && nativeReady)) && (
          <div className="flex shrink-0 gap-2">
            {subscribed && !native && <Button variant="secondary" size="sm" onClick={() => void run(showLocalTest)} disabled={busy}><Send className="size-4" aria-hidden /> Проверить</Button>}
            {subscribed
              ? <Button variant="secondary" size="sm" onClick={() => void disable()} disabled={busy}>Выключить</Button>
              : <Button size="sm" onClick={() => void enable()} loading={busy}><Bell className="size-4" aria-hidden /> Включить</Button>}
          </div>
        )}
      </div>

      {native && !nativeReady && <Alert tone="info">В этой сборке приложения не подключён Firebase, поэтому системные уведомления пока недоступны. Как подключить: шаг «Уведомления» в NATIVE_SETUP.md.</Alert>}
      {!supported && !native && <Alert tone="info">Этот браузер не поддерживает push-уведомления.</Alert>}
      {supported && !native && iosHint && <Alert tone="info">На iPhone и iPad уведомления работают только у приложения на экране «Домой»: в Safari нажмите «Поделиться» → «На экран “Домой”», откройте Together оттуда и включите уведомления.</Alert>}
      {supported && !native && !VAPID_PUBLIC_KEY && <Alert tone="info">Уведомления в браузере не подключены. На телефоне пользуйтесь приложением для Android: уведомления включаются в нём.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {info && !error && <Alert tone="success">{info}</Alert>}

      <ul>
        {rows.filter((r) => !r.hidden).map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 border-b border-sand-100 py-3.5 first:pt-0 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-medium">{row.title}</p>
              <p className="text-sm text-ink-soft">{row.text}</p>
              {row.key === "habits" && prefs.habits && (
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                  Напоминать в
                  <select value={prefs.habits_hour} onChange={(e) => change({ habits_hour: Number(e.target.value) })} className="h-9 rounded-lg border border-sand-300 bg-paper px-2 text-ink">
                    {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                  </select>
                </label>
              )}
            </div>
            <Switch checked={Boolean(prefs[row.key])} onChange={(v) => change({ [row.key]: v } as Partial<NotificationPrefs>)} label={row.title} />
          </li>
        ))}
      </ul>
    </div>
  );
}
