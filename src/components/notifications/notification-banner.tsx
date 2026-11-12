"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/components/notifications/use-push";

const KEY = "together:notif-banner-hidden-until";
const HIDE_DAYS = 14;

const hidden = () => { try { return Number(window.localStorage.getItem(KEY) ?? 0) > Date.now(); } catch { return false; } };

/** Заметное приглашение включить уведомления на главной. Показывается, только пока они выключены, и скрывается на 14 дней. */
export function NotificationBanner() {
  const push = usePush();
  const [dismissed, setDismissed] = useState(hidden);
  if (dismissed || push.status !== "off") return null;

  return (
    <section aria-label="Уведомления" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-200">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-600 text-on-accent"><Bell className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">Включите уведомления</p>
        <p className="text-sm leading-relaxed text-ink-soft">Напомним о привычках, особых днях и расскажем, как себя чувствует партнёр.</p>
        {push.error && <p role="alert" className="mt-1.5 text-sm text-danger">{push.error}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={() => void push.enable()} loading={push.busy}>Включить</Button>
        <button
          type="button"
          aria-label="Скрыть на две недели"
          onClick={() => { try { window.localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 86_400_000)); } catch { /* ignore */ } setDismissed(true); }}
          className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-sand-100 hover:text-ink"
        ><X className="size-4" aria-hidden /></button>
      </div>
    </section>
  );
}
