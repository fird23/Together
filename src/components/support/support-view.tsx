"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Bug, HelpCircle, Lightbulb, MessageCircle, Send, type LucideIcon } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { listMyTickets, sendTicket } from "@/services/support";
import type { SupportTicket, TicketKind, TicketStatus } from "@/types";
import { cn } from "@/utils/cn";

const KINDS: { id: TicketKind; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "idea", label: "Предложение", icon: Lightbulb, hint: "Чего не хватает или что хочется изменить" },
  { id: "bug", label: "Ошибка", icon: Bug, hint: "Что вы делали, что ожидали и что получилось" },
  { id: "question", label: "Вопрос", icon: HelpCircle, hint: "О чём хотите спросить" },
  { id: "other", label: "Другое", icon: MessageCircle, hint: "Всё остальное" },
];

const STATUS: Record<TicketStatus, { label: string; cls: string }> = {
  new: { label: "Отправлено", cls: "bg-sand-100 text-ink-soft" },
  in_progress: { label: "В работе", cls: "bg-accent-100 text-accent-700" },
  done: { label: "Решено", cls: "bg-success-soft text-success" },
  declined: { label: "Закрыто", cls: "bg-sand-100 text-ink-faint" },
};

const MIN = 10;
const MAX = 2000;

export function SupportView() {
  const { profile, session } = useWorkspace();
  const [kind, setKind] = useState<TicketKind>("idea");
  const [message, setMessage] = useState("");
  const [withInfo, setWithInfo] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [listError, setListError] = useState("");

  const loadTickets = useCallback(async () => {
    try { setTickets(await listMyTickets()); setListError(""); }
    catch (e) { setTickets([]); setListError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, []);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  if (!profile || !session) return null;
  const current = KINDS.find((k) => k.id === kind)!;
  const length = message.trim().length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (length < MIN) return setError(`Опишите чуть подробнее: минимум ${MIN} символов.`);
    setPending(true); setError(""); setSent(false);
    try {
      await sendTicket({
        userId: session!.user.id,
        email: profile!.email || session!.user.email || "",
        displayName: profile!.display_name,
        kind,
        message,
        meta: withInfo
          ? {
              page: window.location.pathname,
              screen: `${window.innerWidth}x${window.innerHeight}`,
              theme: `${document.documentElement.dataset.theme ?? "default"}/${document.documentElement.dataset.mode ?? "light"}`,
              userAgent: navigator.userAgent,
            }
          : null,
      });
      setMessage(""); setSent(true);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Поддержка" description="Нашли ошибку, есть идея или вопрос? Напишите — я читаю каждое обращение." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card padding="lg">
          <form onSubmit={submit} noValidate className="space-y-5">
            <fieldset>
              <legend className="mb-2.5 text-sm font-medium">О чём вы пишете?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {KINDS.map(({ id, label, icon: Icon }) => (
                  <label key={id} className="cursor-pointer">
                    <input type="radio" name="kind" value={id} checked={kind === id} onChange={() => setKind(id)} className="peer sr-only" />
                    <span className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-sm font-medium text-ink-soft ring-1 ring-sand-200 transition peer-checked:bg-accent-50 peer-checked:text-accent-700 peer-checked:ring-2 peer-checked:ring-accent-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-600 hover:ring-sand-300">
                      <Icon className="size-5" aria-hidden /> {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="support-message" className="mb-1.5 block text-sm font-medium">Сообщение</label>
              <textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={MAX} rows={7} placeholder={current.hint + "…"} disabled={pending} className="cal-textarea" />
              <p className={cn("mt-1 text-right text-xs", length > 0 && length < MIN ? "text-danger" : "text-ink-faint")}>{length} / {MAX}</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
              <input type="checkbox" checked={withInfo} onChange={(e) => setWithInfo(e.target.checked)} className="mt-0.5 size-4 accent-[var(--c-accent-600)]" />
              <span>Приложить сведения об устройстве и странице. Это помогает быстрее найти ошибку. Пароли и личные данные не отправляются.</span>
            </label>

            {error && <Alert tone="error">{error}</Alert>}
            {sent && !error && <Alert tone="success">Спасибо! Обращение отправлено. Ответ появится справа.</Alert>}
            <Button type="submit" loading={pending}><Send className="size-4" aria-hidden /> Отправить</Button>
          </form>
        </Card>

        <aside>
          <h2 className="mb-3 font-serif text-xl font-semibold">Ваши обращения</h2>
          {tickets === null ? (
            <p className="text-sm text-ink-soft">Загружаем…</p>
          ) : listError ? (
            <Alert tone="error">{listError}</Alert>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-sand-300 px-5 py-8 text-center text-sm leading-relaxed text-ink-faint">
              <Illustration kind="support" className="mb-2" />
              Пока пусто. Когда вы что-нибудь отправите, обращение и мой ответ появятся здесь.
            </div>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => {
                const kindInfo = KINDS.find((k) => k.id === t.kind)!;
                const status = STATUS[t.status];
                return (
                  <li key={t.id} className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-sand-200">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-semibold"><kindInfo.icon className="size-4 text-accent-600" aria-hidden /> {kindInfo.label}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.cls)}>{status.label}</span>
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{t.message}</p>
                    <p className="mt-2 text-xs text-ink-faint">{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(t.created_at))}</p>
                    {t.admin_reply && (
                      <div className="mt-3 rounded-xl bg-accent-50 p-3 text-sm leading-relaxed ring-1 ring-accent-100">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent-700">Ответ</p>
                        <p className="whitespace-pre-wrap">{t.admin_reply}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
