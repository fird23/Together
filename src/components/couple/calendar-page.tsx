"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Illustration } from "@/components/ui/illustrations";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { CalendarEventModal, type EventDraft } from "@/components/couple/calendar-event-modal";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useCalendarTodos } from "@/hooks/use-calendar-todos";
import { setTodoDone } from "@/services/todos";
import { featureOn } from "@/utils/features";
import { cleanTodoTitle } from "@/utils/todo-title";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "@/services/calendar";
import { colorHex, dayShift, eventsInRange, eventsOnDay } from "@/utils/calendar";
import { addDays, pluralRu, todayISO } from "@/utils/days";
import type { CalendarEvent, Todo } from "@/types";
import type { CSSProperties } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MAX_CHIPS = 3;
const DAY_FORMS: [string, string, string] = ["день", "дня", "дней"];

type MenuState = { x: number; y: number; target: { kind: "day"; iso: string } | { kind: "event"; event: CalendarEvent } };

const evStyle = (hex: string) => ({ "--ev": hex }) as CSSProperties;
const longDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const shortDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
const rangeLabel = (a: string, b: string) => (a === b ? shortDate(a) : `${shortDate(a)} — ${shortDate(b)}`);

export function CalendarPage() {
  const { couple, profile } = useWorkspace();
  const router = useRouter();
  const today = todayISO();
  // /calendar?date=2026-11-20 открывает календарь сразу на этом дне (так ведут дни с главной)
  const dateParam = useSearchParams().get("date");
  const initialDay = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(Date.parse(dateParam)) ? dateParam : null;
  const [cursor, setCursor] = useState(() => (initialDay ? new Date(`${initialDay}T12:00:00`) : new Date()));
  const [anchor, setAnchor] = useState(initialDay ?? today);
  const [head, setHead] = useState(initialDay ?? today);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [actionError, setActionError] = useState("");
  const dragging = useRef(false);
  const dragEvent = useRef<{ ev: CalendarEvent; from: string } | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const press = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  /** Телефон: после «Выбрать период» следующее касание задаёт последний день периода. */
  const [rangeMode, setRangeMode] = useState(false);
  const [slide, setSlide] = useState<"next" | "prev" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const gridStart = todayISO(new Date(year, month, 1 - firstOffset));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // 42 строк — дёшево, мемоизация не нужна
  const { events, error, reload } = useCalendarEvents(cells[0], cells[41]);
  const { todos, reload: reloadTodos } = useCalendarTodos(cells[0], cells[41], featureOn(couple, "todos"));
  const todosOnDay = (iso: string) => todos.filter((t) => t.due_day === iso);

  const selStart = anchor < head ? anchor : head;
  const selEnd = anchor < head ? head : anchor;
  const selCount = Math.round((Date.parse(selEnd) - Date.parse(selStart)) / 86_400_000) + 1;
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor);
  const selectedEvents = eventsInRange(events, selStart, selEnd);
  const selectedTodos = todos.filter((t) => t.due_day !== null && t.due_day >= selStart && t.due_day <= selEnd);

  // /calendar#new (кнопка «+» на телефоне) сразу открывает создание пометки на сегодня
  useEffect(() => {
    if (window.location.hash === "#new") setDraft({ title: "", note: "", color: "rose", start: initialDay ?? today, end: initialDay ?? today, repeat: "none" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Отпускание кнопки мыши где угодно завершает выделение.
  useEffect(() => {
    const stop = () => { dragging.current = false; };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => { window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
  }, []);

  // Меню закрывается по Esc, клику снаружи, прокрутке и изменению размера.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) close(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const openMenu = useCallback((x: number, y: number, target: MenuState["target"]) => {
    const width = 244, height = target.kind === "day" ? 196 : 100;
    setMenu({ x: Math.max(8, Math.min(x, window.innerWidth - width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - height - 8)), target });
  }, []);

  const openNew = (start: string, end: string) => { setMenu(null); setDraft({ title: "", note: "", color: "rose", start, end, repeat: "none" }); };
  const openEdit = (e: CalendarEvent) => { setMenu(null); setDraft({ id: e.id, title: e.title, note: e.note ?? "", color: e.color, start: e.series_start ?? e.start_day, end: e.series_end ?? e.end_day, repeat: e.repeat ?? "none" }); };

  async function save(input: EventInput, id?: string) {
    if (!couple || !profile) return;
    if (id) await updateEvent(id, input); else await createEvent(couple.id, profile.id, input);
    await reload();
  }
  async function remove(id: string) { await deleteEvent(id); await reload(); }
  async function removeWithConfirm(e: CalendarEvent) {
    setMenu(null); setActionError("");
    if (!window.confirm(e.repeat && e.repeat !== "none" ? `Удалить повторяющуюся пометку «${e.title}» целиком (все повторы)?` : `Удалить пометку «${e.title}»?`)) return;
    try { await remove(e.id); } catch (err) { setActionError(err instanceof Error ? err.message : "Не удалось удалить пометку."); }
  }

  /** Перенос пометки на другой день: сдвигает её даты (у повторяющейся сдвигается вся серия). */
  async function moveEvent(toIso: string) {
    const drag = dragEvent.current;
    dragEvent.current = null;
    setDropDay(null);
    if (!drag || toIso === drag.from) return;
    const { ev } = drag;
    const delta = dayShift(drag.from, toIso);
    if (ev.repeat && ev.repeat !== "none" && !window.confirm(`«${ev.title}» повторяется. Перенести всю серию на ${delta > 0 ? "+" : ""}${delta} дн.?`)) return;
    setActionError("");
    try {
      await updateEvent(ev.id, { title: ev.title, note: ev.note ?? "", color: ev.color, start: addDays(ev.series_start ?? ev.start_day, delta), end: addDays(ev.series_end ?? ev.end_day, delta), repeat: ev.repeat ?? "none" });
      await reload();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Не удалось перенести пометку."); }
  }

  function onDayPointerDown(e: ReactPointerEvent, iso: string) {
    if (e.button !== 0) return; // правая кнопка не меняет выделение — этим занимается меню
    setMenu(null);
    if (e.pointerType === "touch") {
      // Телефон: короткое касание выбирает день (см. onDayPointerUp), долгое нажатие открывает меню, а свайп листает месяц.
      const { clientX, clientY } = e;
      pressStart.current = { x: clientX, y: clientY };
      if (press.current) clearTimeout(press.current);
      press.current = window.setTimeout(() => { press.current = null; setRangeMode(false); setAnchor(iso); setHead(iso); openMenu(clientX, clientY, { kind: "day", iso }); }, 520);
      return;
    }
    if (e.shiftKey) setHead(iso);
    else { setAnchor(iso); setHead(iso); }
    dragging.current = e.pointerType === "mouse";
  }
  const cancelPress = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
  function onDayPointerUp(e: ReactPointerEvent, iso: string) {
    if (e.pointerType === "touch" && press.current) {
      cancelPress();
      if (rangeMode) { setHead(iso); setRangeMode(false); } else { setAnchor(iso); setHead(iso); }
      return;
    }
    cancelPress();
  }
  function onDayPointerMove(e: ReactPointerEvent) {
    // Дрожание пальца не считается движением: отменяем нажатие, только если палец сдвинулся заметно.
    if (e.pointerType !== "touch" || !pressStart.current) return;
    if (Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 10) cancelPress();
  }
  function onDayEnter(iso: string) { if (dragging.current) setHead(iso); }
  function onDayContext(e: ReactMouseEvent, iso: string) {
    e.preventDefault();
    cancelPress();
    if (iso < selStart || iso > selEnd) { setAnchor(iso); setHead(iso); }
    openMenu(e.clientX, e.clientY, { kind: "day", iso });
  }
  function onChipContext(e: ReactMouseEvent, event: CalendarEvent) {
    e.preventDefault(); e.stopPropagation();
    openMenu(e.clientX, e.clientY, { kind: "event", event });
  }

  const goTo = (d: Date) => {
    const diff = d.getFullYear() * 12 + d.getMonth() - (year * 12 + month);
    setSlide(diff === 0 ? null : diff > 0 ? "next" : "prev");
    setCursor(d); setMenu(null); setRangeMode(false);
  };
  const monthShift = (n: number) => goTo(new Date(year, month + n, 1));

  // Свайп по сетке: влево — следующий месяц, вправо — предыдущий (только явное горизонтальное движение).
  function onSwipeStart(e: React.TouchEvent) { swipe.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }
  function onSwipeEnd(e: React.TouchEvent) {
    const start = swipe.current; swipe.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) { cancelPress(); monthShift(dx < 0 ? 1 : -1); }
  }

  async function toggleTodo(t: Todo) {
    if (!profile) return;
    setActionError("");
    try { await setTodoDone(t.id, profile.id, !t.done_at); await reloadTodos(); }
    catch (err) { setActionError(err instanceof Error ? err.message : "Не удалось обновить дело."); }
  }
  const menuDay = menu?.target.kind === "day" ? menu.target.iso : null;
  const inSelection = menuDay !== null && menuDay >= selStart && menuDay <= selEnd;
  const newStart = menuDay && inSelection ? selStart : menuDay ?? today;
  const newEnd = menuDay && inSelection ? selEnd : menuDay ?? today;

  return (
    <div className="calendar-page-full">
      <Link href="/dashboard" className="calendar-back-link"><ArrowLeft size={16} /> На главную</Link>
      <header className="calendar-page-heading">
        <span className="dashboard-icon icon-rose"><CalendarDays size={22} /></span>
        <div><p className="eyebrow">ВАШИ ОБЩИЕ ПЛАНЫ</p><h1 className="font-serif">Календарь</h1><p>Отмечайте важные дни: один или сразу несколько подряд.</p></div>
      </header>

      <section className="dashboard-card calendar-full-card">
        <div className="calendar-full-toolbar">
          <button className="calendar-nav" onClick={() => monthShift(-1)} aria-label="Предыдущий месяц"><ChevronLeft /></button>
          <h2 className="font-serif">{monthName}</h2>
          <button className="calendar-nav" onClick={() => monthShift(1)} aria-label="Следующий месяц"><ChevronRight /></button>
          <button className="calendar-today" onClick={() => { goTo(new Date()); setAnchor(today); setHead(today); }}>Сегодня</button>
        </div>

        {rangeMode && (
          <div className="cal-range-banner" role="status">
            <span>Нажмите на последний день периода</span>
            <button type="button" onClick={() => setRangeMode(false)}>Отмена</button>
          </div>
        )}

        <div key={`${year}-${month}`} className={`calendar-full-grid ${slide ? `cal-slide-${slide}` : ""}`} role="grid" aria-label={monthName} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
          {WEEKDAYS.map((x) => <div className="calendar-full-weekday" key={x} role="columnheader">{x}</div>)}
          {cells.map((iso) => {
            const dayEvents = eventsOnDay(events, iso);
            const dayTodos = todosOnDay(iso);
            const room = Math.max(0, MAX_CHIPS - dayEvents.length);
            const extra = Math.max(0, dayEvents.length - MAX_CHIPS) + Math.max(0, dayTodos.length - room);
            const inRange = iso >= selStart && iso <= selEnd;
            const cls = ["cal-day", iso === today && "is-today", dropDay === iso && "drop-target", inRange && "in-range", inRange && iso === selStart && "range-start", inRange && iso === selEnd && "range-end", Number(iso.slice(5, 7)) !== month + 1 && "is-other"].filter(Boolean).join(" ");
            return (
              <div
                key={iso}
                role="gridcell"
                tabIndex={0}
                aria-selected={inRange}
                aria-label={longDate(iso)}
                className={cls}
                onPointerDown={(e) => onDayPointerDown(e, iso)}
                onDragOver={(e) => { if (dragEvent.current) { e.preventDefault(); if (dropDay !== iso) setDropDay(iso); } }}
                onDrop={(e) => { e.preventDefault(); void moveEvent(iso); }}
                onPointerEnter={() => onDayEnter(iso)}
                onPointerUp={(e) => onDayPointerUp(e, iso)}
                onPointerMove={onDayPointerMove}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => onDayContext(e, iso)}
                onDoubleClick={() => openNew(iso, iso)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAnchor(iso); setHead(iso); } }}
              >
                <span className="cal-num">{Number(iso.slice(8))}</span>
                <span className="cal-chips">
                  {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                    <div key={`${ev.id}:${ev.start_day}`} role="button" tabIndex={0} draggable className="cal-chip" style={evStyle(colorHex(ev.color))}
                      title={`${ev.title}${ev.start_day !== ev.end_day ? ` (${rangeLabel(ev.start_day, ev.end_day)})` : ""}${ev.repeat && ev.repeat !== "none" ? " · повторяется" : ""}. Перетащите на другой день, чтобы перенести`}
                      onDragStart={(e) => { dragEvent.current = { ev, from: iso }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ev.id); setMenu(null); }}
                      onDragEnd={() => { dragEvent.current = null; setDropDay(null); }}
                      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} onContextMenu={(e) => onChipContext(e, ev)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); openEdit(ev); } }}>
                      {ev.repeat && ev.repeat !== "none" ? "↻ " : ""}{ev.title}
                    </div>
                  ))}
                  {dayTodos.slice(0, room).map((t) => (
                    <div key={t.id} role="button" tabIndex={0} className={`cal-chip cal-chip-todo ${t.done_at ? "is-done" : ""}`} style={evStyle(colorHex(t.color ?? "gray"))}
                      title={`Дело: ${cleanTodoTitle(t.title)}${t.done_at ? " (сделано)" : ""}`}
                      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); router.push("/todos"); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); router.push("/todos"); } }}>
                      {t.done_at ? "✓ " : "☐ "}{cleanTodoTitle(t.title)}
                    </div>
                  ))}
                  {extra > 0 && <span className="cal-more">+{extra} ещё</span>}
                </span>
                {dayEvents.length + dayTodos.length > 0 && (
                  <span className="cal-dots" aria-hidden="true">
                    {dayEvents.slice(0, 4).map((ev) => <i key={`${ev.id}:${ev.start_day}`} style={evStyle(colorHex(ev.color))} />)}
                    {dayTodos.slice(0, Math.max(0, 4 - dayEvents.length)).map((t) => <i key={t.id} className="is-todo" style={evStyle(colorHex(t.color ?? "gray"))} />)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="cal-hint cal-hint-desktop">Зажмите кнопку мыши и проведите по дням (или Shift + клик), чтобы выбрать несколько. Правая кнопка мыши открывает меню, двойной клик создаёт пометку. Пометку можно перетащить на другой день, чтобы изменить дату. Дела со сроком показаны в календаре значком ☐.</p>
        <p className="cal-hint cal-hint-touch">Нажмите на день, чтобы выбрать его. Долгое нажатие открывает меню (там можно выбрать период из нескольких дней). Листайте месяцы свайпом влево и вправо.</p>
      </section>

      {(error || actionError) && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error || actionError}</p>}

      <section className="dashboard-card cal-selected">
        <div className="cal-selected-head">
          <div>
            <p className="cal-selected-title">{selCount === 1 ? longDate(selStart) : `${rangeLabel(selStart, selEnd)}`}</p>
            {selCount > 1 && <p className="cal-selected-sub">Выбрано {selCount} {pluralRu(selCount, DAY_FORMS)}</p>}
          </div>
          <button type="button" className="cal-add" onClick={() => openNew(selStart, selEnd)}><Plus size={15} /> Добавить пометку</button>
        </div>
        {selectedEvents.length === 0 && selectedTodos.length === 0 ? (
          <div className="cal-empty"><Illustration kind="calendar" className="mx-auto h-20 w-28" /><p>На {selCount === 1 ? "этот день" : "эти дни"} пока ничего нет.</p></div>
        ) : (
          <ul className="cal-list">
            {selectedTodos.map((t) => (
              <li key={`todo:${t.id}`} className={`cal-todo-row ${t.done_at ? "is-done" : ""}`} style={evStyle(colorHex(t.color ?? "gray"))}>
                <button type="button" className={`cal-todo-check ${t.done_at ? "checked" : ""}`} onClick={() => void toggleTodo(t)} aria-pressed={Boolean(t.done_at)} aria-label={t.done_at ? "Снять отметку «сделано»" : "Отметить сделанным"}>{t.done_at ? <Check size={14} /> : null}</button>
                <div><strong>{cleanTodoTitle(t.title)}</strong><small><ListChecks size={11} className="inline" aria-hidden /> Дело · {shortDate(t.due_day!)}</small></div>
                <span><button type="button" onClick={() => router.push("/todos")} aria-label="Открыть список дел"><ChevronRight size={15} /></button></span>
              </li>
            ))}
            {selectedEvents.map((ev) => (
              <li key={`${ev.id}:${ev.start_day}`} style={evStyle(colorHex(ev.color))} onContextMenu={(e) => onChipContext(e, ev)}>
                <i aria-hidden="true" />
                <div><strong>{ev.title}</strong><small>{ev.repeat && ev.repeat !== "none" ? "↻ " : ""}{rangeLabel(ev.start_day, ev.end_day)}{ev.note ? ` · ${ev.note}` : ""}</small></div>
                <span>
                  <button type="button" onClick={() => openEdit(ev)} aria-label={`Изменить ${ev.title}`}><Pencil size={14} /></button>
                  <button type="button" className="danger" onClick={() => void removeWithConfirm(ev)} aria-label={`Удалить ${ev.title}`}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {menu && createPortal(
        <div ref={menuRef} role="menu" className="cal-menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {menu.target.kind === "day" ? (
            <>
              <p className="cal-menu-title">{inSelection && selCount > 1 ? `${rangeLabel(selStart, selEnd)} · ${selCount} ${pluralRu(selCount, DAY_FORMS)}` : longDate(menu.target.iso)}</p>
              <button role="menuitem" onClick={() => openNew(newStart, newEnd)}><Plus size={15} />{inSelection && selCount > 1 ? "Пометка на выбранные дни" : "Новая пометка"}</button>
              <button role="menuitem" onClick={() => { if (menu.target.kind === "day") { setAnchor(menu.target.iso); setHead(menu.target.iso); setRangeMode(true); } setMenu(null); }}><CalendarDays size={15} />Выбрать период из нескольких дней</button>
              <button role="menuitem" onClick={() => { const d = menu.target.kind === "day" ? menu.target.iso : today; const w = (new Date(`${d}T12:00:00`).getDay() + 6) % 7; setAnchor(addDays(d, -w)); setHead(addDays(d, 6 - w)); setMenu(null); }}><CalendarDays size={15} />Выбрать всю неделю</button>
              <button role="menuitem" onClick={() => { setAnchor(today); setHead(today); goTo(new Date()); }}><ChevronRight size={15} />Перейти к сегодня</button>
            </>
          ) : (
            <>
              <p className="cal-menu-title"><i style={evStyle(colorHex(menu.target.event.color))} />{menu.target.event.title}</p>
              <button role="menuitem" onClick={() => menu.target.kind === "event" && openEdit(menu.target.event)}><Pencil size={15} />Изменить</button>
              <button role="menuitem" className="danger" onClick={() => menu.target.kind === "event" && void removeWithConfirm(menu.target.event)}><Trash2 size={15} />Удалить</button>
            </>
          )}
        </div>,
        document.body,
      )}

      <CalendarEventModal draft={draft} onClose={() => setDraft(null)} onSave={save} onDelete={remove} />
    </div>
  );
}
