"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { statusCopy, usePush } from "@/components/notifications/use-push";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { defaultPrefs, getPrefs, savePrefs } from "@/services/notifications";
import { featureOn } from "@/utils/features";
import type { NotificationPrefs } from "@/types";

const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00–23:00

/** Включение push на этом устройстве и выбор, о чём напоминать. */
export function NotificationSettings() {
  const { profile, couple } = useWorkspace();
  const push = usePush();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [prefsError, setPrefsError] = useState("");

  const loadPrefs = useCallback(async () => {
    if (!profile) return;
    try { setPrefs(await getPrefs(profile.id)); } catch (e) { setPrefsError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [profile]);
  useEffect(() => { void loadPrefs(); }, [loadPrefs]);

  if (!profile) return null;
  const habitsOn = featureOn(couple, "habits");
  const { status } = push;
  const copy = statusCopy(status, push.native);
  const subscribed = status === "on";
  const actionable = status === "off" || status === "on";

  const change = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch, timezone: defaultPrefs().timezone };
    setPrefs(next);
    void savePrefs(profile.id, next).catch((e) => setPrefsError(e instanceof Error ? e.message : GENERIC_ERROR));
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
            <p className="font-semibold">{status === "loading" ? "Проверяем…" : copy.title}</p>
            <p className="text-sm text-ink-soft">{copy.text}</p>
          </div>
        </div>
        {actionable && (
          <div className="flex shrink-0 gap-2">
            {subscribed && <Button variant="secondary" size="sm" onClick={() => void push.test()} disabled={push.busy}><Send className="size-4" aria-hidden /> Проверить</Button>}
            {subscribed
              ? <Button variant="secondary" size="sm" onClick={() => void push.disable()} disabled={push.busy}>Выключить</Button>
              : <Button size="sm" onClick={() => void push.enable()} loading={push.busy}><Bell className="size-4" aria-hidden /> Включить</Button>}
          </div>
        )}
      </div>

      {push.error && <Alert tone="error">{push.error}</Alert>}
      {prefsError && <Alert tone="error">{prefsError}</Alert>}
      {push.info && !push.error && <Alert tone="success">{push.info}</Alert>}

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
