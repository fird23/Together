"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { statusCopy, usePush } from "@/components/notifications/use-push";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { refreshWebSubscription } from "@/lib/push";
import { saveSubscription } from "@/services/notifications";
import { cn } from "@/utils/cn";

/** Кнопка уведомлений в шапке: показывает состояние и включает уведомления в один шаг. */
export function NotificationBell() {
  const { profile } = useWorkspace();
  const push = usePush();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const synced = useRef(false);
  const { status } = push;

  // Включённым уведомлениям раз за сеанс обновляем подписку в базе (она могла пропасть или смениться ключ).
  useEffect(() => {
    if (status !== "on" || push.native || synced.current || !profile) return;
    synced.current = true;
    void refreshWebSubscription().then((sub) => sub && saveSubscription(profile.id, sub)).catch(() => {});
  }, [status, push.native, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  if (!profile || status === "loading") return null;
  const copy = statusCopy(status, push.native);
  const attention = status === "off" || status === "denied";
  const canAct = status === "off" || status === "on";
  const Icon = status === "on" ? BellRing : attention ? BellOff : Bell;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); push.clearMessages(); }}
        aria-label={status === "on" ? "Уведомления включены" : "Уведомления: настроить"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-sand-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        <Icon className="size-5" aria-hidden />
        {attention && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-milk" aria-hidden />}
      </button>

      {open && (
        <div role="dialog" aria-label="Уведомления" className="fixed inset-x-4 top-[4.25rem] z-30 rounded-2xl bg-paper p-4 shadow-lift ring-1 ring-sand-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <p className="font-semibold">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{copy.text}</p>
          {push.error && <Alert tone="error" className="mt-3">{push.error}</Alert>}
          {push.info && !push.error && <Alert tone="success" className="mt-3">{push.info}</Alert>}
          <div className={cn("mt-3 flex flex-wrap items-center gap-2", !canAct && "hidden")}>
            {status === "off" && <Button size="sm" onClick={() => void push.enable()} loading={push.busy}><Bell className="size-4" aria-hidden /> Включить</Button>}
            {status === "on" && <Button size="sm" variant="secondary" onClick={() => void push.test()} loading={push.busy}><Send className="size-4" aria-hidden /> Проверить</Button>}
          </div>
          <Link href="/settings#notifications" onClick={() => setOpen(false)} className="mt-3 inline-block text-sm font-semibold text-accent-700 underline underline-offset-4">Настройки уведомлений</Link>
        </div>
      )}
    </div>
  );
}
