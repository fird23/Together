"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownUp, CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Illustration } from "@/components/ui/illustrations";
import { FeatureOff } from "@/components/ui/feature-off";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RowMenu } from "@/components/ui/row-menu";
import { DueDateButton } from "@/components/todos/due-date-button";
import { ColorPicker } from "@/components/ui/color-picker";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { addTodo, listTodos, removeTodo, setTodoDone, updateTodo } from "@/services/todos";
import { addDays, todayISO } from "@/utils/days";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";
import { colorHex } from "@/utils/calendar";
import type { EventColor, Todo } from "@/types";

type Who = "both" | "me" | "partner";
type Filter = "all" | Who;
type Sort = "due" | "new" | "old" | "alpha";

const shortDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
const SORTS: { id: Sort; label: string }[] = [
  { id: "due", label: "По сроку" }, { id: "new", label: "Сначала новые" }, { id: "old", label: "Сначала старые" }, { id: "alpha", label: "По алфавиту" },
];

export function TodosView() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState("");
  const [who, setWho] = useState<Who>("both");
  const [due, setDue] = useState("");
  const [color, setColor] = useState<EventColor | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("due");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const ready = Boolean(couple && profile);
  useEffect(() => { if (ready && window.location.hash === "#new") titleRef.current?.focus(); }, [ready]);

  const load = useCallback(async () => {
    if (!couple) return;
    try { setItems(await listTodos(couple.id)); setError(""); }
    catch (e) { setItems((prev) => prev ?? []); setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("todos", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  if (!couple || !profile) return null;
  if (!featureOn(couple, "todos")) return <FeatureOff kind="todos" title="Дела" />;

  const partnerName = partner?.display_name ?? "Партнёр";
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const nameOf = (id: string | null) => (id === null ? "Вместе" : id === profile.id ? "Вы" : partnerName);
  const dueLabel = (iso: string) => (iso === today ? "Сегодня" : iso === tomorrow ? "Завтра" : shortDate(iso));
  const whoOf = (t: Todo): Who => (t.assignee_id === null ? "both" : t.assignee_id === profile.id ? "me" : "partner");
  const assigneeId = (w: Who) => (w === "both" ? null : w === "me" ? profile.id : partner?.id ?? null);

  const sorters: Record<Sort, (a: Todo, b: Todo) => number> = {
    due: (a, b) => (a.due_day ?? "9999").localeCompare(b.due_day ?? "9999") || b.created_at.localeCompare(a.created_at),
    new: (a, b) => b.created_at.localeCompare(a.created_at),
    old: (a, b) => a.created_at.localeCompare(b.created_at),
    alpha: (a, b) => a.title.localeCompare(b.title, "ru"),
  };
  const all = (items ?? []).filter((t) => filter === "all" || whoOf(t) === filter);
  const active = all.filter((t) => !t.done_at).sort(sorters[sort]);
  const done = all.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const shown = tab === "active" ? active : done;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Все" }, { id: "me", label: "Мои" }, ...(partner ? [{ id: "partner" as Filter, label: partnerName }] : []), { id: "both", label: "Вместе" },
  ];

  async function run(task: () => Promise<void>) {
    setError("");
    try { await task(); await load(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !couple || !profile) return;
    setBusy(true);
    await run(async () => {
      await addTodo({ coupleId: couple.id, userId: profile.id, title, assigneeId: assigneeId(who), dueDay: due || null, color });
      setTitle(""); setDue(""); setColor(null);
    });
    setBusy(false);
  }

  const toggle = (t: Todo) => {
    const nowDone = !t.done_at;
    setItems((old) => (old ?? []).map((x) => (x.id === t.id ? { ...x, done_at: nowDone ? new Date().toISOString() : null, done_by: nowDone ? profile!.id : null } : x)));
    void run(() => setTodoDone(t.id, profile!.id, nowDone));
  };
  const remove = (t: Todo) => { if (window.confirm(`Удалить дело «${t.title}»?`)) void run(() => removeTodo(t.id)); };
  const clearDone = () => {
    if (!window.confirm(`Удалить выполненные дела (${done.length})?`)) return;
    void run(async () => { await Promise.all(done.map((t) => removeTodo(t.id))); });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Список дел" description="Общие и личные дела: от «купить билеты» до «позвонить маме». Изменения видны обоим сразу." />

      <form onSubmit={submit} className="mb-6 rounded-card bg-paper p-4 shadow-soft ring-1 ring-sand-200 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Новое дело…" aria-label="Новое дело" className="hb-input flex-1" />
          <button disabled={!title.trim() || busy} className="hb-submit mt-0! sm:w-auto! sm:px-6"><Plus className="mr-1.5 inline size-4" aria-hidden />Добавить</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="hb-segment mt-0!" role="radiogroup" aria-label="Для кого дело">
            {([["both", "Вместе"], ["me", "Я"], ...(partner ? [["partner", partnerName]] : [])] as [Who, string][]).map(([id, label]) => (
              <button type="button" key={id} role="radio" aria-checked={who === id} className={cn("px-3", who === id && "active")} onClick={() => setWho(id)}>{label}</button>
            ))}
          </div>
          <DueDateButton value={due} onChange={setDue} />
          <ColorPicker value={color} onChange={setColor} label="Цвет дела" />
        </div>
      </form>

      <div className="todo-toolbar">
        <div className="todo-filters" role="group" aria-label="Чьи дела показывать">
          {filters.map((f) => <button type="button" key={f.id} aria-pressed={filter === f.id} className={filter === f.id ? "active" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>)}
        </div>
        <label className="todo-sort"><ArrowDownUp size={14} aria-hidden="true" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сортировка">{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </label>
      </div>

      <div className="wishlist-tabs mb-4" role="tablist">
        <button role="tab" aria-selected={tab === "active"} className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Нужно сделать <span>{active.length}</span></button>
        <button role="tab" aria-selected={tab === "done"} className={tab === "done" ? "active" : ""} onClick={() => setTab("done")}>Готово <span>{done.length}</span></button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {items === null ? (
        <p className="text-sm text-ink-soft">Загружаем…</p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-sand-300 px-5 py-10 text-center text-sm leading-relaxed text-ink-faint">
          <Illustration kind="todos" />
          <p className="mt-2">{filter !== "all" ? "В этом разделе ничего нет." : tab === "active" ? "Все дела сделаны. Добавьте новое или отдохните." : "Выполненных дел пока нет."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => {
            const overdue = !t.done_at && t.due_day !== null && t.due_day < today;
            return (
              <li key={t.id} style={t.color ? ({ "--hc": colorHex(t.color) } as React.CSSProperties) : undefined} className={cn("group flex items-center gap-3.5 rounded-2xl bg-paper px-4 py-3 shadow-soft ring-1 ring-sand-200", t.color && "todo-colored", t.done_at && "opacity-70")}>
                <button type="button" onClick={() => toggle(t)} aria-pressed={Boolean(t.done_at)} aria-label={t.done_at ? `Вернуть: ${t.title}` : `Готово: ${t.title}`} className={cn("hb-check", t.done_at && "checked")}>
                  {t.done_at && <Check size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("[overflow-wrap:anywhere] font-medium", t.done_at && "text-ink-faint line-through")}>{t.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700">{nameOf(t.assignee_id)}</span>
                    {t.due_day && <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-danger" : "text-ink-faint")}><CalendarDays className="size-3" aria-hidden />{overdue ? "Просрочено · " : ""}{dueLabel(t.due_day)}</span>}
                    {t.done_at && t.done_by && <span className="text-ink-faint">Сделал(а): {nameOf(t.done_by)}</span>}
                  </p>
                </div>
                <span className="hb-actions">
                  <button type="button" aria-label={`Изменить ${t.title}`} onClick={() => setEditing(t)}><Pencil size={15} /></button>
                  <button type="button" className="danger" aria-label={`Удалить ${t.title}`} onClick={() => remove(t)}><Trash2 size={15} /></button>
                </span>
                <RowMenu label={t.title} items={[{ label: "Изменить", icon: Pencil, onClick: () => setEditing(t) }, { label: "Удалить", icon: Trash2, danger: true, onClick: () => remove(t) }]} />
              </li>
            );
          })}
        </ul>
      )}
      {tab === "done" && done.length > 0 && <button type="button" onClick={clearDone} className="mt-4 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-danger">Очистить выполненные</button>}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Изменить дело">
        {editing && <EditForm key={editing.id} todo={editing} who={whoOf(editing)} partnerName={partnerName} hasPartner={Boolean(partner)}
          onCancel={() => setEditing(null)}
          onSave={async (value) => { await run(() => updateTodo(editing.id, { title: value.title, assigneeId: assigneeId(value.who), dueDay: value.due || null, color: value.color })); setEditing(null); }} />}
      </Modal>
    </div>
  );
}

function EditForm({ todo, who: initialWho, partnerName, hasPartner, onCancel, onSave }: {
  todo: Todo; who: Who; partnerName: string; hasPartner: boolean; onCancel: () => void; onSave: (v: { title: string; who: Who; due: string; color: EventColor | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [who, setWho] = useState<Who>(initialWho);
  const [due, setDue] = useState(todo.due_day ?? "");
  const [color, setColor] = useState<EventColor | null>(todo.color ?? null);
  const [pending, setPending] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; setPending(true); await onSave({ title, who, due, color }); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Название дела" className="hb-input" autoFocus />
      <div className="hb-segment mt-0!" role="radiogroup" aria-label="Для кого дело">
        {([["both", "Вместе"], ["me", "Я"], ...(hasPartner ? [["partner", partnerName]] : [])] as [Who, string][]).map(([id, label]) => (
          <button type="button" key={id} role="radio" aria-checked={who === id} className={cn("px-3", who === id && "active")} onClick={() => setWho(id)}>{label}</button>
        ))}
      </div>
      <DueDateButton value={due} onChange={setDue} />
      <ColorPicker value={color} onChange={setColor} label="Цвет дела" />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>Отмена</Button>
        <Button type="submit" loading={pending}>Сохранить</Button>
      </div>
    </form>
  );
}
