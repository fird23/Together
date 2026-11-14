"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, BellRing, Check, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { statusCopy, usePush } from "@/components/notifications/use-push";
import { useInbox } from "@/components/notifications/use-inbox";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { refreshWebSubscription } from "@/lib/push";
import { saveSubscription } from "@/services/notifications";
import { cn } from "@/utils/cn";

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  if (d === 1) return "вчера";
  if (d < 7) return `${d} дн. назад`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(iso));
};

/** Кнопка уведомлений в шапке: список уведомлений, счётчик непрочитанных и включение на этом устройстве. */
export function NotificationBell() {
  const { profile } = useWorkspace();
  const router = useRouter();
  const push = usePush();
  const inbox = useInbox();
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
  const showStatusCard = status !== "on" && Boolean(copy.title);
  const Icon = status === "on" ? BellRing : attention ? BellOff : Bell;
  const items = inbox.items ?? [];
  const badge = inbox.unread > 9 ? "9+" : inbox.unread;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); push.clearMessages(); }}
        aria-label={inbox.unread > 0 ? `Уведомления: непрочитанных ${inbox.unread}` : "Уведомления"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-sand-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        <Icon className="size-5" aria-hidden />
        {inbox.unread > 0
          ? <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-accent-600 px-1 text-[10px] font-bold leading-[1.15rem] text-on-accent ring-2 ring-milk">{badge}</span>
          : attention && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-milk" aria-hidden />}
      </button>

      {open && (
        <div role="dialog" aria-label="Уведомления" className="fixed inset-x-4 top-[4.25rem] z-30 flex max-h-[min(34rem,calc(var(--vvh,100dvh)-5.5rem))] flex-col rounded-2xl bg-paper shadow-lift ring-1 ring-sand-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <p className="font-semibold">Уведомления</p>
            <div className="flex items-center gap-1">
              {inbox.unread > 0 && <button type="button" onClick={() => void inbox.readAll()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-700 hover:bg-sand-100"><Check className="size-3.5" aria-hidden /> Прочитать все</button>}
              {items.length > 0 && <button type="button" onClick={() => { if (window.confirm("Очистить список уведомлений?")) void inbox.clear(); }} aria-label="Очистить список" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-sand-100 hover:text-danger"><Trash2 className="size-4" aria-hidden /></button>}
            </div>
          </div>

          {showStatusCard && (
            <div className="mx-4 mb-2 rounded-xl bg-accent-50 p-3 ring-1 ring-accent-100">
              <p className="text-sm font-semibold">{copy.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{copy.text}</p>
              {push.error && <Alert tone="error" className="mt-2">{push.error}</Alert>}
              {status === "off" && <Button size="sm" className="mt-2.5" onClick={() => void push.enable()} loading={push.busy}><Bell className="size-4" aria-hidden /> Включить</Button>}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
            {inbox.items === null ? (
              <p className="px-2 py-6 text-center text-sm text-ink-faint">Загружаем…</p>
            ) : inbox.failed && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-faint">Список не загрузился. Примените миграцию 028_notifications_inbox.sql и обновите страницу.</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm leading-relaxed text-ink-faint">Пока нет уведомлений. Здесь появятся напоминания о привычках, особые дни и новости от партнёра.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => { void inbox.read([n.id]); setOpen(false); if (n.url) router.push(n.url); }}
                      className={cn("flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-sand-100 focus-visible:bg-sand-100 focus-visible:outline-none", !n.read_at && "bg-accent-50/70")}
                    >
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent-600")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{n.title}</span>
                          <span className="shrink-0 text-[11px] text-ink-faint">{ago(n.created_at)}</span>
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-3 block text-[13px] leading-snug text-ink-soft [overflow-wrap:anywhere]">{n.body}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand-200 px-4 py-2.5">
            {status === "on"
              ? <button type="button" onClick={() => void push.test()} disabled={push.busy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink disabled:opacity-60"><Send className="size-3.5" aria-hidden /> Проверить на этом устройстве</button>
              : <span />}
            <Link href="/settings#notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-accent-700 underline underline-offset-4">Настройки</Link>
          </div>
          {status === "on" && (push.error || push.info) && (
            <div className="px-4 pb-3">{push.error ? <Alert tone="error">{push.error}</Alert> : <Alert tone="success">{push.info}</Alert>}</div>
          )}
        </div>
      )}
    </div>
  );
}
