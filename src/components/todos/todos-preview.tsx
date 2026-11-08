"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Plus } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { addTodo, listTodos, setTodoDone } from "@/services/todos";
import { addDays, todayISO } from "@/utils/days";
import { cn } from "@/utils/cn";
import { colorHex } from "@/utils/calendar";
import type { Todo } from "@/types";

const LIMIT = 5;

/** Короткий список дел для главной: ближайшие дела, быстрое добавление и ссылка на весь список. */
export function TodosPreview() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!couple) return;
    try { setItems(await listTodos(couple.id)); setError(""); }
    catch (e) { setItems((prev) => prev ?? []); setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("todos", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  if (!couple || !profile) return null;
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const partnerName = partner?.display_name ?? "Партнёр";
  const active = (items ?? []).filter((t) => !t.done_at).sort((a, b) => (a.due_day ?? "9999").localeCompare(b.due_day ?? "9999") || b.created_at.localeCompare(a.created_at));
  const shown = active.slice(0, LIMIT);
  const who = (id: string | null) => (id === null ? "Вместе" : id === profile.id ? "Вы" : partnerName);

  async function run(task: () => Promise<void>) {
    setError("");
    try { await task(); await load(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !couple || !profile) return;
    const text = title;
    setTitle("");
    void run(() => addTodo({ coupleId: couple.id, userId: profile.id, title: text, assigneeId: null, dueDay: null }));
  };
  const complete = (t: Todo) => {
    setItems((old) => (old ?? []).map((x) => (x.id === t.id ? { ...x, done_at: new Date().toISOString(), done_by: profile!.id } : x)));
    void run(() => setTodoDone(t.id, profile!.id, true));
  };

  return (
    <section className="dashboard-card dash-preview">
      <form onSubmit={add} className="dash-quick-add">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Добавить дело…" aria-label="Новое дело" className="hb-input" />
        <button disabled={!title.trim()} aria-label="Добавить дело"><Plus size={18} /></button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {items === null ? (
        <p className="mt-3 text-sm text-ink-soft">Загружаем…</p>
      ) : shown.length === 0 ? (
        <div className="dash-preview-empty"><Illustration kind="todos" className="h-20 w-28" /><p>Все дела сделаны. Добавьте новое или отдохните.</p></div>
      ) : (
        <ul className="dash-todo-list">
          {shown.map((t) => {
            const overdue = t.due_day !== null && t.due_day < today;
            return (
              <li key={t.id}>
                <button type="button" onClick={() => complete(t)} className="hb-check" aria-label={`Готово: ${t.title}`}><Check size={14} className="opacity-0" /></button>
                {t.color && <i className="dash-todo-dot" style={{ background: colorHex(t.color) }} aria-hidden="true" />}
                <span className="dash-todo-title">{t.title}</span>
                <span className="dash-todo-meta">
                  <em>{who(t.assignee_id)}</em>
                  {t.due_day && <b className={cn(overdue && "overdue")}><CalendarDays size={11} />{t.due_day === today ? "Сегодня" : t.due_day === tomorrow ? "Завтра" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t.due_day}T00:00:00Z`)).replace(".", "")}</b>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/todos" className="calendar-open-link">{active.length > LIMIT ? `Ещё ${active.length - LIMIT} · все дела` : "Открыть список дел"} <ArrowUpRight size={14} /></Link>
    </section>
  );
}
