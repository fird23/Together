"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { CalendarEventModal, type EventDraft } from "@/components/couple/calendar-event-modal";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { createEvent, deleteEvent, updateEvent, type EventInput } from "@/services/calendar";
import { colorHex, eventsInRange, eventsOnDay } from "@/utils/calendar";
import { addDays, pluralRu, todayISO } from "@/utils/days";
import type { CalendarEvent } from "@/types";
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
  const [cursor, setCursor] = useState(() => new Date());
  const today = todayISO();
  const [anchor, setAnchor] = useState(today);
  const [head, setHead] = useState(today);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [actionError, setActionError] = useState("");
  const dragging = useRef(false);
  const press = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const gridStart = todayISO(new Date(year, month, 1 - firstOffset));
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const { events, error, reload } = useCalendarEvents(cells[0], cells[41]);

  const selStart = anchor < head ? anchor : head;
  const selEnd = anchor < head ? head : anchor;
  const selCount = Math.round((Date.parse(selEnd) - Date.parse(selStart)) / 86_400_000) + 1;
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor);
  const selectedEvents = eventsInRange(events, selStart, selEnd);

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
    const width = 244, height = target.kind === "day" ? 150 : 100;
    setMenu({ x: Math.max(8, Math.min(x, window.innerWidth - width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - height - 8)), target });
  }, []);

  const openNew = (start: string, end: string) => { setMenu(null); setDraft({ title: "", note: "", color: "rose", start, end }); };
  const openEdit = (e: CalendarEvent) => { setMenu(null); setDraft({ id: e.id, title: e.title, note: e.note ?? "", color: e.color, start: e.start_day, end: e.end_day }); };

  async function save(input: EventInput, id?: string) {
    if (!couple || !profile) return;
    if (id) await updateEvent(id, input); else await createEvent(couple.id, profile.id, input);
    await reload();
  }
  async function remove(id: string) { await deleteEvent(id); await reload(); }
  async function removeWithConfirm(e: CalendarEvent) {
    setMenu(null); setActionError("");
    if (!window.confirm(`Удалить пометку «${e.title}»?`)) return;
    try { await remove(e.id); } catch (err) { setActionError(err instanceof Error ? err.message : "Не удалось удалить пометку."); }
  }

  function onDayPointerDown(e: ReactPointerEvent, iso: string) {
    if (e.button !== 0) return; // правая кнопка не меняет выделение — этим занимается меню
    setMenu(null);
    if (e.shiftKey) setHead(iso);
    else { setAnchor(iso); setHead(iso); }
    dragging.current = e.pointerType === "mouse";
    if (e.pointerType === "touch") {
      // долгое нажатие на телефоне = правая кнопка мыши
      const { clientX, clientY } = e;
      press.current = window.setTimeout(() => { setAnchor(iso); setHead(iso); openMenu(clientX, clientY, { kind: "day", iso }); }, 520);
    }
  }
  const cancelPress = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
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

  const goTo = (d: Date) => { setCursor(d); setMenu(null); };
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
          <button className="calendar-nav" onClick={() => goTo(new Date(year, month - 1, 1))} aria-label="Предыдущий месяц"><ChevronLeft /></button>
          <h2 className="font-serif">{monthName}</h2>
          <button className="calendar-nav" onClick={() => goTo(new Date(year, month + 1, 1))} aria-label="Следующий месяц"><ChevronRight /></button>
          <button className="calendar-today" onClick={() => { goTo(new Date()); setAnchor(today); setHead(today); }}>Сегодня</button>
        </div>

        <div className="calendar-full-grid" role="grid" aria-label={monthName}>
          {WEEKDAYS.map((x) => <div className="calendar-full-weekday" key={x} role="columnheader">{x}</div>)}
          {cells.map((iso) => {
            const dayEvents = eventsOnDay(events, iso);
            const inRange = iso >= selStart && iso <= selEnd;
            const cls = ["cal-day", iso === today && "is-today", inRange && "in-range", inRange && iso === selStart && "range-start", inRange && iso === selEnd && "range-end", Number(iso.slice(5, 7)) !== month + 1 && "is-other"].filter(Boolean).join(" ");
            return (
              <div
                key={iso}
                role="gridcell"
                tabIndex={0}
                aria-selected={inRange}
                aria-label={longDate(iso)}
                className={cls}
                onPointerDown={(e) => onDayPointerDown(e, iso)}
                onPointerEnter={() => onDayEnter(iso)}
                onPointerUp={cancelPress}
                onPointerMove={(e) => { if (e.pointerType === "touch") cancelPress(); }}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => onDayContext(e, iso)}
                onDoubleClick={() => openNew(iso, iso)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAnchor(iso); setHead(iso); } }}
              >
                <span className="cal-num">{Number(iso.slice(8))}</span>
                <span className="cal-chips">
                  {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                    <button key={ev.id} type="button" className="cal-chip" style={evStyle(colorHex(ev.color))} title={`${ev.title}${ev.start_day !== ev.end_day ? ` (${rangeLabel(ev.start_day, ev.end_day)})` : ""}`}
                      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} onContextMenu={(e) => onChipContext(e, ev)}>
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > MAX_CHIPS && <span className="cal-more">+{dayEvents.length - MAX_CHIPS} ещё</span>}
                </span>
                {dayEvents.length > 0 && (
                  <span className="cal-dots" aria-hidden="true">{dayEvents.slice(0, 4).map((ev) => <i key={ev.id} style={evStyle(colorHex(ev.color))} />)}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="cal-hint">Зажмите кнопку мыши и проведите по дням (или Shift + клик), чтобы выбрать несколько. Правая кнопка мыши (на телефоне — долгое нажатие) открывает меню, двойной клик создаёт пометку.</p>
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
        {selectedEvents.length === 0 ? (
          <p className="cal-empty">На {selCount === 1 ? "этот день" : "эти дни"} пока ничего нет.</p>
        ) : (
          <ul className="cal-list">
            {selectedEvents.map((ev) => (
              <li key={ev.id} style={evStyle(colorHex(ev.color))} onContextMenu={(e) => onChipContext(e, ev)}>
                <i aria-hidden="true" />
                <div><strong>{ev.title}</strong><small>{rangeLabel(ev.start_day, ev.end_day)}{ev.note ? ` · ${ev.note}` : ""}</small></div>
                <span>
                  <button type="button" onClick={() => openEdit(ev)} aria-label={`Изменить ${ev.title}`}><Pencil size={14} /></button>
                  <button type="button" className="danger" onClick={() => void removeWithConfirm(ev)} aria-label={`Удалить ${ev.title}`}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {menu && (
        <div ref={menuRef} role="menu" className="cal-menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {menu.target.kind === "day" ? (
            <>
              <p className="cal-menu-title">{inSelection && selCount > 1 ? `${rangeLabel(selStart, selEnd)} · ${selCount} ${pluralRu(selCount, DAY_FORMS)}` : longDate(menu.target.iso)}</p>
              <button role="menuitem" onClick={() => openNew(newStart, newEnd)}><Plus size={15} />{inSelection && selCount > 1 ? "Пометка на выбранные дни" : "Новая пометка"}</button>
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
        </div>
      )}

      <CalendarEventModal draft={draft} onClose={() => setDraft(null)} onSave={save} onDelete={remove} />
    </div>
  );
}
