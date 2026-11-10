"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { 
  CalendarDays, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  GripVertical, 
  MessageSquare, 
  Pencil, 
  Plus, 
  Trash2, 
  X 
} from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { addTodo, listTodos, removeTodo, setTodoDone, setTodoOrder, updateTodo } from "@/services/todos";
import { addDays, todayISO } from "@/utils/days";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";
import { colorHex } from "@/utils/calendar";
import type { EventColor, Todo } from "@/types";

type Who = "both" | "me" | "partner";
type Filter = "all" | Who;

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface ParsedTodoData {
  cleanTitle: string;
  comment: string;
  subtasks: Subtask[];
}

function parseTodoTitle(rawTitle: string): ParsedTodoData {
  try {
    if (rawTitle.startsWith("{") && rawTitle.endsWith("}")) {
      const parsed = JSON.parse(rawTitle);
      return {
        cleanTitle: parsed.t || "",
        comment: parsed.c || "",
        subtasks: Array.isArray(parsed.s) ? parsed.s : [],
      };
    }
  } catch {}
  return { cleanTitle: rawTitle, comment: "", subtasks: [] };
}

function encodeTodoTitle(cleanTitle: string, comment: string, subtasks: Subtask[]): string {
  if (!comment.trim() && subtasks.length === 0) {
    return cleanTitle.trim();
  }
  return JSON.stringify({
    t: cleanTitle.trim(),
    c: comment.trim(),
    s: subtasks,
  });
}

const shortDate = (iso: string) => 
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(".", "");

/** Строка списка, которую можно перетащить за ручку слева. Перетаскивание только по вертикали и только за ручку, поэтому прокрутка пальцем не мешает. */
function SortableLi({ id, enabled, className, style, children }: {
  id: string; enabled: boolean; className?: string; style?: React.CSSProperties; children: (grip: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled });
  const grip = enabled ? (
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="todo-grip" aria-label="Перетащить, чтобы изменить порядок">
      <GripVertical size={17} aria-hidden />
    </button>
  ) : null;
  return (
    <li ref={setNodeRef} className={cn(className, isDragging && "is-dragging")}
      style={{ ...style, transform: CSS.Transform.toString(transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null), transition, position: "relative", zIndex: isDragging ? 5 : undefined }}>
      {children(grip)}
    </li>
  );
}

export function TodosView() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  
  const [who, setWho] = useState<Who>("both");
  const [due, setDue] = useState("");
  const [color, setColor] = useState<EventColor | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [expandedTodoIds, setExpandedTodoIds] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // Ручной порядок (sort_order, миграция 022); без него — новые сверху, как раньше.
  const defaultSorter = (a: Todo, b: Todo) =>
    a.sort_order !== undefined && b.sort_order !== undefined ? a.sort_order - b.sort_order : b.created_at.localeCompare(a.created_at);

  const all = (items ?? []).filter((t) => filter === "all" || whoOf(t) === filter);
  const active = all.filter((t) => !t.done_at).sort(defaultSorter);
  const done = all.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const shown = tab === "active" ? active : done;
  const canReorder = tab === "active" && (items ?? []).some((t) => typeof t.sort_order === "number");

  /** Новое место дела: между соседями (среднее их значений). Если места почти не осталось, перенумеровываем весь список. */
  async function onDragEnd({ active: dragged, over }: DragEndEvent) {
    if (!over || dragged.id === over.id) return;
    const from = active.findIndex((t) => t.id === dragged.id), to = active.findIndex((t) => t.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(active, from, to);
    const moved = next[to], before = next[to - 1], after = next[to + 1];
    const b = before?.sort_order, a = after?.sort_order;
    const gapTooSmall = b !== undefined && a !== undefined && Math.abs(a - b) < 1e-6;
    setError("");
    try {
      if (gapTooSmall) {
        const full = (items ?? []).filter((t) => !t.done_at).sort(defaultSorter).filter((t) => t.id !== moved.id);
        const at = before ? full.findIndex((t) => t.id === before.id) + 1 : 0;
        full.splice(at, 0, moved);
        setItems((prev) => prev?.map((t) => { const i = full.findIndex((x) => x.id === t.id); return i >= 0 ? { ...t, sort_order: i * 1024 } : t; }) ?? prev);
        await Promise.all(full.map((t, i) => setTodoOrder(t.id, i * 1024)));
      } else {
        const value = b !== undefined && a !== undefined ? (a + b) / 2 : b !== undefined ? b + 1 : a !== undefined ? a - 1 : 0;
        setItems((prev) => prev?.map((t) => (t.id === moved.id ? { ...t, sort_order: value } : t)) ?? prev);
        await setTodoOrder(moved.id, value);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
      await load();
    }
  }
  
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Все" }, { id: "me", label: "Мои" }, ...(partner ? [{ id: "partner" as Filter, label: partnerName }] : []), { id: "both", label: "Вместе" },
  ];

  async function run(task: () => Promise<void>) {
    setError("");
    try { await task(); await load(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }

  const addSubtaskToForm = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle("");
  };

  const removeSubtaskFromForm = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !couple || !profile) return;
    setBusy(true);

    const fullSubtasks = [...subtasks];
    if (newSubtaskTitle.trim()) {
      fullSubtasks.push({ id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false });
    }

    const encodedTitle = encodeTodoTitle(title, comment, fullSubtasks);

    await run(async () => {
      await addTodo({ coupleId: couple.id, userId: profile.id, title: encodedTitle, assigneeId: assigneeId(who), dueDay: due || null, color });
      setTitle(""); setComment(""); setSubtasks([]); setNewSubtaskTitle(""); setDue(""); setColor(null); setShowDetails(false);
    });
    setBusy(false);
  }

  const toggle = (t: Todo) => {
    const nowDone = !t.done_at;
    setItems((old) => (old ?? []).map((x) => (x.id === t.id ? { ...x, done_at: nowDone ? new Date().toISOString() : null, done_by: nowDone ? profile!.id : null } : x)));
    void run(() => setTodoDone(t.id, profile!.id, nowDone));
  };

  const toggleSubtask = (todo: Todo, subtaskId: string) => {
    const { cleanTitle, comment: c, subtasks: s } = parseTodoTitle(todo.title);
    const updatedSubtasks = s.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st));
    const newEncoded = encodeTodoTitle(cleanTitle, c, updatedSubtasks);

    setItems((old) => (old ?? []).map((x) => (x.id === todo.id ? { ...x, title: newEncoded } : x)));
    void run(() => updateTodo(todo.id, { title: newEncoded, assigneeId: todo.assignee_id, dueDay: todo.due_day, color: todo.color }));
  };

  const remove = (t: Todo) => {
    const { cleanTitle } = parseTodoTitle(t.title);
    if (window.confirm(`Удалить дело «${cleanTitle}»?`)) void run(() => removeTodo(t.id)); 
  };
  
  const clearDone = () => {
    if (!window.confirm(`Удалить выполненные дела (${done.length})?`)) return;
    void run(async () => { await Promise.all(done.map((t) => removeTodo(t.id))); });
  };

  const toggleExpand = (id: string) => {
    setExpandedTodoIds((prev) => ({ ...prev, [id]: !prev[id] }))
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Список дел" description="Общие и личные дела: от «купить билеты» до «позвонить маме». Изменения видны обоим сразу." />

      {/* Компактная и аккуратная форма добавления */}
      <form onSubmit={submit} className="mb-6 rounded-card bg-paper p-4 shadow-soft ring-1 ring-sand-200 sm:p-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input 
            ref={titleRef} 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            maxLength={120} 
            placeholder="Новое дело…" 
            aria-label="Новое дело" 
            className="hb-input flex-1 text-sm" 
          />
          <button disabled={!title.trim() || busy} className="hb-submit mt-0! sm:w-auto! sm:px-6">
            <Plus className="mr-1.5 inline size-4" aria-hidden />Добавить
          </button>
        </div>

        {/* Настройки (Кто, Срок, Цвет) и переключатель деталей в одной аккуратной строке */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="hb-segment mt-0!" role="radiogroup" aria-label="Для кого дело">
              {([["both", "Вместе"], ["me", "Я"], ...(partner ? [["partner", partnerName]] : [])] as [Who, string][]).map(([id, label]) => (
                <button type="button" key={id} role="radio" aria-checked={who === id} className={cn("px-2.5 py-1 text-xs", who === id && "active")} onClick={() => setWho(id)}>{label}</button>
              ))}
            </div>
            <DueDateButton value={due} onChange={setDue} />
            <ColorPicker value={color} onChange={setColor} label="Цвет дела" />
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium text-accent-700 hover:underline flex items-center gap-1"
          >
            <MessageSquare size={13} />
            {showDetails ? "Скрыть детали" : "+ Комментарий и подпункты"}
          </button>
        </div>

        {/* Выдвигающийся блок деталей (комментарий и подпункты) */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t border-sand-200 animate-fadeIn">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий к делу (необязательно)…"
              className="hb-input text-xs"
            />

            <div className="space-y-2">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-xs bg-sand-50 px-2.5 py-1.5 rounded-lg">
                  <span className="flex-1 font-medium">{st.title}</span>
                  <button type="button" onClick={() => removeSubtaskFromForm(st.id)} className="text-ink-faint hover:text-danger">
                    <X size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskToForm(); } }}
                  placeholder="Добавить подпункт…"
                  className="hb-input flex-1 text-xs"
                />
                <button type="button" onClick={addSubtaskToForm} className="hb-button text-xs px-3 py-1 bg-secondary hover:bg-secondary/80">
                  + Подпункт
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Панель вкладок и фильтров */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:mt-8" role="tablist">
        <div className="wishlist-tabs mb-0" role="tablist">
          <button role="tab" aria-selected={tab === "active"} className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Нужно сделать <span>{active.length}</span></button>
          <button role="tab" aria-selected={tab === "done"} className={tab === "done" ? "active" : ""} onClick={() => setTab("done")}>Готово <span>{done.length}</span></button>
        </div>

        <div className="todo-filters self-end sm:self-auto" role="group" aria-label="Чьи дела показывать">
          {filters.map((f) => <button type="button" key={f.id} aria-pressed={filter === f.id} className={filter === f.id ? "active" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>)}
        </div>
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
        <SortableContext items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {shown.map((t) => {
            const { cleanTitle, comment: itemComment, subtasks: itemSubtasks } = parseTodoTitle(t.title);
            const overdue = !t.done_at && t.due_day !== null && t.due_day < today;
            const completedSubtasks = itemSubtasks.filter((s) => s.done).length;
            const hasDetails = Boolean(itemComment || itemSubtasks.length > 0);
            const isExpanded = expandedTodoIds[t.id] ?? true;

            return (
              <SortableLi key={t.id} id={t.id} enabled={canReorder} style={t.color ? ({ "--hc": colorHex(t.color) } as React.CSSProperties) : undefined} className={cn("group flex flex-col rounded-2xl bg-paper px-4 py-3 shadow-soft ring-1 ring-sand-200", t.color && "todo-colored", t.done_at && "opacity-70")}>
                {(grip) => (<>
                <div className="flex items-center gap-3.5">
                  {grip}
                  <button type="button" onClick={() => toggle(t)} aria-pressed={Boolean(t.done_at)} aria-label={t.done_at ? `Вернуть: ${cleanTitle}` : `Готово: ${cleanTitle}`} className={cn("hb-check", t.done_at && "checked")}>
                    {t.done_at && <Check size={14} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("[overflow-wrap:anywhere] font-medium", t.done_at && "text-ink-faint line-through")}>{cleanTitle}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700">{nameOf(t.assignee_id)}</span>
                      {t.due_day && <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-danger" : "text-ink-faint")}><CalendarDays className="size-3" aria-hidden />{overdue ? "Просрочено · " : ""}{dueLabel(t.due_day)}</span>}
                      {itemSubtasks.length > 0 && (
                        <span className="rounded-md bg-sand-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                          {completedSubtasks}/{itemSubtasks.length} подпунктов
                        </span>
                      )}
                      {itemComment && <span className="inline-flex items-center gap-1 text-ink-faint"><MessageSquare className="size-3" />Комментарий</span>}
                      {t.done_at && t.done_by && <span className="text-ink-faint">Сделал(а): {nameOf(t.done_by)}</span>}
                    </p>
                  </div>
                  
                  {hasDetails && (
                    <button type="button" onClick={() => toggleExpand(t.id)} className="text-ink-faint hover:text-ink">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}

                  <span className="hb-actions">
                    <button type="button" aria-label={`Изменить ${cleanTitle}`} onClick={() => setEditing(t)}><Pencil size={15} /></button>
                    <button type="button" className="danger" aria-label={`Удалить ${cleanTitle}`} onClick={() => remove(t)}><Trash2 size={15} /></button>
                  </span>
                  <RowMenu label={cleanTitle} items={[{ label: "Изменить", icon: Pencil, onClick: () => setEditing(t) }, { label: "Удалить", icon: Trash2, danger: true, onClick: () => remove(t) }]} />
                </div>

                {hasDetails && isExpanded && (
                  <div className="mt-3 border-t border-sand-100 pt-2.5 pl-8 space-y-2">
                    {itemComment && (
                      <p className="text-xs text-ink-soft bg-sand-50/70 p-2 rounded-lg italic">
                        {itemComment}
                      </p>
                    )}
                    {itemSubtasks.length > 0 && (
                      <div className="space-y-1.5">
                        {itemSubtasks.map((st) => (
                          <div key={st.id} className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(t, st.id)}
                              className={cn("size-4 rounded border flex items-center justify-center transition-colors", st.done ? "bg-accent-600 border-accent-600 text-white" : "border-sand-300 hover:border-accent-600")}
                            >
                              {st.done && <Check size={11} />}
                            </button>
                            <span className={cn(st.done && "line-through text-ink-faint")}>{st.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </>)}
              </SortableLi>
            );
          })}
        </ul>
        </SortableContext>
        </DndContext>
      )}
      {tab === "done" && done.length > 0 && <button type="button" onClick={clearDone} className="mt-4 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-danger">Очистить выполненные</button>}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Изменить дело">
        {editing && <EditForm key={editing.id} todo={editing} who={whoOf(editing)} partnerName={partnerName} hasPartner={Boolean(partner)}
          onCancel={() => setEditing(null)}
          onSave={async (value) => { 
            const encodedTitle = encodeTodoTitle(value.title, value.comment, value.subtasks);
            await run(() => updateTodo(editing.id, { title: encodedTitle, assigneeId: assigneeId(value.who), dueDay: value.due || null, color: value.color })); 
            setEditing(null); 
          }} />}
      </Modal>
    </div>
  );
}

function EditForm({ todo, who: initialWho, partnerName, hasPartner, onCancel, onSave }: {
  todo: Todo; who: Who; partnerName: string; hasPartner: boolean; onCancel: () => void; onSave: (v: { title: string; comment: string; subtasks: Subtask[]; who: Who; due: string; color: EventColor | null }) => Promise<void>;
}) {
  const initialData = parseTodoTitle(todo.title);
  const [title, setTitle] = useState(initialData.cleanTitle);
  const [comment, setComment] = useState(initialData.comment);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialData.subtasks);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  const [who, setWho] = useState<Who>(initialWho);
  const [due, setDue] = useState(todo.due_day ?? "");
  const [color, setColor] = useState<EventColor | null>(todo.color ?? null);
  const [pending, setPending] = useState(false);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  return (
    <form className="space-y-4" onSubmit={async (e) => { 
      e.preventDefault(); 
      if (!title.trim()) return; 
      setPending(true); 
      const fullSubtasks = [...subtasks];
      if (newSubtaskTitle.trim()) {
        fullSubtasks.push({ id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false });
      }
      await onSave({ title, comment, subtasks: fullSubtasks, who, due, color }); 
    }}>
      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Название дела</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Название дела" className="hb-input" autoFocus />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Комментарий</label>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавьте пояснение к делу…" className="hb-input text-xs" />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Подпункты</label>
        <div className="space-y-2 mb-2">
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 text-xs bg-sand-50 px-2.5 py-1.5 rounded-lg">
              <span className="flex-1 font-medium">{st.title}</span>
              <button type="button" onClick={() => removeSubtask(st.id)} className="text-ink-faint hover:text-danger">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
            placeholder="Добавить подпункт…"
            className="hb-input flex-1 text-xs"
          />
          <button type="button" onClick={addSubtask} className="hb-button text-xs px-3 py-1 bg-secondary">
            Добавить
          </button>
        </div>
      </div>

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