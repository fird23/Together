"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, HelpCircle, Lightbulb, MessageCircle, Send, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GENERIC_ERROR } from "@/lib/errors";
import { getAdminStats, isAdmin, listAllTickets, listAudit, updateTicket } from "@/services/admin";
import type { AdminStats, AdminTicket, AuditEntry, TicketKind, TicketStatus } from "@/types";
import { cn } from "@/utils/cn";

const KINDS: Record<TicketKind, { label: string; icon: LucideIcon }> = {
  idea: { label: "Предложение", icon: Lightbulb },
  bug: { label: "Ошибка", icon: Bug },
  question: { label: "Вопрос", icon: HelpCircle },
  other: { label: "Другое", icon: MessageCircle },
};

const STATUS: Record<TicketStatus, { label: string; cls: string }> = {
  new: { label: "Новое", cls: "bg-sand-100 text-ink-soft" },
  in_progress: { label: "В работе", cls: "bg-accent-100 text-accent-700" },
  done: { label: "Решено", cls: "bg-success-soft text-success" },
  declined: { label: "Закрыто", cls: "bg-sand-100 text-ink-faint" },
};

const FILTERS: { id: TicketStatus | "all"; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "in_progress", label: "В работе" },
  { id: "done", label: "Решённые" },
  { id: "declined", label: "Закрытые" },
  { id: "all", label: "Все" },
];

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function AdminView() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void isAdmin().then((ok) => {
      if (!alive) return;
      setAllowed(ok);
      if (!ok) router.replace("/dashboard");
    });
    return () => { alive = false; };
  }, [router]);

  if (allowed !== true) return <p className="text-sm text-ink-soft">Проверяем доступ…</p>;
  return <AdminContent />;
}

function AdminContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [filter, setFilter] = useState<TicketStatus | "all">("new");
  const [tickets, setTickets] = useState<AdminTicket[] | null>(null);
  const [ticketsError, setTicketsError] = useState("");
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const loadStats = useCallback(async () => {
    try { setStats(await getAdminStats()); setStatsError(""); }
    catch (e) { setStatsError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, []);
  const loadTickets = useCallback(async () => {
    try { setTickets(await listAllTickets(filter)); setTicketsError(""); }
    catch (e) { setTickets([]); setTicketsError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [filter]);
  const loadAudit = useCallback(async () => {
    try { setAudit(await listAudit()); } catch { setAudit([]); }
  }, []);

  useEffect(() => { void loadStats(); void loadAudit(); }, [loadStats, loadAudit]);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const refreshAll = () => { void loadStats(); void loadTickets(); void loadAudit(); };

  const cards: { label: string; value: number | string; hint?: string }[] = stats
    ? [
        { label: "Пользователи", value: stats.users, hint: `новых за 7 дней: ${stats.new_users_7d}` },
        { label: "Пары", value: stats.couples, hint: `вдвоём: ${stats.couples_complete}` },
        { label: "Активны за 7 дней", value: stats.active_7d },
        { label: "Активны за 30 дней", value: stats.active_30d },
        { label: "Уведомления: Android", value: stats.android_devices, hint: "пользователей с устройством" },
        { label: "Уведомления: браузер", value: stats.web_push_users, hint: "пользователей с подпиской" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Админ-панель" description="Только агрегаты и обращения. Личное содержимое пар здесь недоступно." />

      <section aria-labelledby="admin-stats" className="mb-8">
        <h2 id="admin-stats" className="mb-3 font-serif text-xl font-semibold">Сводка</h2>
        {statsError ? (
          <Alert tone="error">{statsError}</Alert>
        ) : !stats ? (
          <p className="text-sm text-ink-soft">Загружаем…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <Card key={c.label} padding="sm">
                <p className="text-xs font-medium text-ink-faint">{c.label}</p>
                <p className="mt-1 font-serif text-3xl font-semibold">{c.value}</p>
                {c.hint && <p className="mt-1 text-xs text-ink-faint">{c.hint}</p>}
              </Card>
            ))}
          </div>
        )}
        {stats && (
          <p className="mt-3 text-sm text-ink-soft">
            Обращения: новых {stats.tickets.new ?? 0}, в работе {stats.tickets.in_progress ?? 0}, решено {stats.tickets.done ?? 0}, закрыто {stats.tickets.declined ?? 0}.
          </p>
        )}
        <p className="mt-1 text-xs text-ink-faint">Активность считается с момента применения миграции: раньше данных о заходах не было.</p>
      </section>

      <section aria-labelledby="admin-tickets" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="admin-tickets" className="font-serif text-xl font-semibold">Обращения</h2>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Фильтр по статусу">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => { setTickets(null); setFilter(f.id); }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  filter === f.id ? "bg-accent-600 text-on-accent" : "bg-sand-100 text-ink-soft hover:bg-sand-200",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {tickets === null ? (
          <p className="text-sm text-ink-soft">Загружаем…</p>
        ) : ticketsError ? (
          <Alert tone="error">{ticketsError}</Alert>
        ) : tickets.length === 0 ? (
          <div className="rounded-card border border-dashed border-sand-300 px-5 py-8 text-center text-sm text-ink-faint">Здесь пусто.</div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => <TicketItem key={t.id} ticket={t} onChanged={refreshAll} />)}
          </ul>
        )}
      </section>

      <section aria-labelledby="admin-audit">
        <h2 id="admin-audit" className="mb-3 font-serif text-xl font-semibold">Журнал действий</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-ink-faint">Пока нет записей.</p>
        ) : (
          <Card padding="sm">
            <ul className="divide-y divide-sand-200 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-ink-soft">
                    {a.action === "ticket_update" ? "Обращение" : a.action}
                    {a.details && typeof a.details.status_to === "string" && ` → ${STATUS[a.details.status_to as TicketStatus]?.label ?? a.details.status_to}`}
                    {a.details?.reply_changed === true && ", ответ"}
                  </span>
                  <span className="text-xs text-ink-faint">{fmt(a.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function TicketItem({ ticket: t, onChanged }: { ticket: AdminTicket; onChanged: () => void }) {
  const [reply, setReply] = useState(t.admin_reply ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showMeta, setShowMeta] = useState(false);
  const kind = KINDS[t.kind];
  const status = STATUS[t.status];
  const trimmed = reply.trim();
  const replyChanged = trimmed.length > 0 && trimmed !== (t.admin_reply ?? "");

  async function run(key: string, patch: { status?: TicketStatus; admin_reply?: string | null }) {
    setPending(key); setError("");
    try { await updateTicket(t.id, patch); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    finally { setPending(null); }
  }

  return (
    <li className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-sand-200">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <kind.icon className="size-4 text-accent-600" aria-hidden /> {kind.label}
        </span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.cls)}>{status.label}</span>
      </div>
      <p className="text-xs text-ink-faint">
        {t.display_name ?? "—"} · {t.email ?? "—"} · {fmt(t.created_at)}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{t.message}</p>

      {t.meta && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowMeta((v) => !v)} className="text-xs font-medium text-accent-700 hover:underline">
            {showMeta ? "Скрыть сведения об устройстве" : "Сведения об устройстве"}
          </button>
          {showMeta && (
            <dl className="mt-1.5 space-y-0.5 text-xs text-ink-soft">
              {Object.entries(t.meta).map(([k, v]) => (
                <div key={k} className="flex gap-2"><dt className="font-medium">{k}:</dt><dd className="min-w-0 break-words">{String(v)}</dd></div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="mt-3">
        <label htmlFor={`reply-${t.id}`} className="mb-1 block text-xs font-medium text-ink-faint">Ответ автору</label>
        <textarea
          id={`reply-${t.id}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={4000}
          rows={3}
          disabled={pending !== null}
          placeholder="Напишите ответ: автор получит уведомление"
          className="cal-textarea"
        />
      </div>

      {error && <Alert tone="error" className="mt-2">{error}</Alert>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!replyChanged}
          loading={pending === "reply"}
          onClick={() => void run("reply", { admin_reply: trimmed, ...(t.status === "new" ? { status: "in_progress" as const } : {}) })}
        >
          <Send className="size-4" aria-hidden /> Ответить
        </Button>
        {t.status !== "in_progress" && <Button size="sm" variant="secondary" loading={pending === "in_progress"} onClick={() => void run("in_progress", { status: "in_progress" })}>В работу</Button>}
        {t.status !== "done" && <Button size="sm" variant="secondary" loading={pending === "done"} onClick={() => void run("done", { status: "done" })}>Решено</Button>}
        {t.status !== "declined" && <Button size="sm" variant="ghost" loading={pending === "declined"} onClick={() => void run("declined", { status: "declined" })}>Закрыть</Button>}
      </div>
    </li>
  );
}
