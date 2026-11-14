"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/utils/cn";
import { colorHex, layoutDay, minToTime, timeToMin } from "@/utils/calendar";
import { addDays } from "@/utils/days";
import { cleanTodoTitle } from "@/utils/todo-title";
import type { CalendarEvent, Todo } from "@/types";

const HOUR = 48; // пикселей на час
const SNAP = 15; // шаг сетки, минут
const DAY_MIN = 1440;
const MIN_LAYOUT = 30; // для раскладки короткое событие занимает хотя бы столько
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const px = (m: number) => (m / 60) * HOUR;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const roundTo = (m: number, step = SNAP) => Math.round(m / step) * step;
const floorTo = (m: number, step = SNAP) => Math.floor(m / step) * step;
const ceilTo = (m: number, step = SNAP) => Math.ceil(m / step) * step;
const evStyle = (hex: string) => ({ "--ev": hex }) as CSSProperties;
const keyOf = (ev: CalendarEvent) => `${ev.id}:${ev.start_day}`;
const fullDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

type Op =
  | { kind: "create"; day: string; a: number; b: number }
  | { kind: "move"; key: string; day: string; start: number; end: number }
  | { kind: "resize"; key: string; end: number };

type Drag = { kind: "move" | "resize"; ev: CalendarEvent; key: string; day: string; start: number; end: number; grab: number; x0: number; y0: number; moved: boolean };

/**
 * Неделя как в Google Календаре: события со временем стоят блоками по часам, пометки на весь день и дела
 * со сроком лежат сверху. Создать: протяните по свободному месту (мышь) или нажмите на него (телефон).
 * Блок можно перетащить (день и время) и растянуть за нижний край (мышь).
 */
export function CalendarWeek({
  weekStart, today, events, todos, onCreate, onCreateAllDay, onEdit, onChangeTimes, onOpenTodos,
}: {
  weekStart: string;
  today: string;
  events: CalendarEvent[];
  todos: Todo[];
  onCreate: (day: string, startMin: number, endMin: number) => void;
  onCreateAllDay: (day: string) => void;
  onEdit: (ev: CalendarEvent) => void;
  onChangeTimes: (ev: CalendarEvent, day: string, startMin: number, endMin: number) => void;
  onOpenTodos: () => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scroller = useRef<HTMLDivElement>(null);
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const opRef = useRef<Op | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const tap = useRef<{ x: number; y: number; t: number; raw: number } | null>(null);
  const suppressClick = useRef(false);
  const [op, setOpState] = useState<Op | null>(null);
  const [now, setNow] = useState(() => new Date());

  const setOp = (next: Op | null) => { opRef.current = next; setOpState(next); };

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // При открытии недели прокручиваем к рабочему времени или к текущему часу.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const todayIdx = days.indexOf(today);
    el.scrollTop = px(todayIdx >= 0 ? Math.max(0, nowMin - 90) : 7 * 60);
    // Телефон: сетка шире экрана, поэтому подводим к сегодняшнему дню
    el.scrollLeft = todayIdx > 0 ? Math.max(0, (todayIdx - 1) * ((el.scrollWidth - 46) / 7)) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const timed = events.filter((e) => e.start_time && e.end_time);
  const allDay = (day: string) => events.filter((e) => !e.start_time && e.start_day <= day && day <= e.end_day);
  const todosOn = (day: string) => todos.filter((t) => t.due_day === day);

  /** Где событие стоит сейчас (с учётом перетаскивания и растягивания). */
  const placed = (ev: CalendarEvent) => {
    const k = keyOf(ev);
    let day = ev.start_day, start = timeToMin(ev.start_time!), end = timeToMin(ev.end_time!);
    if (op?.kind === "move" && op.key === k) ({ day, start, end } = op);
    if (op?.kind === "resize" && op.key === k) end = op.end;
    return { day, start, end };
  };

  const minutesAt = (col: HTMLElement, clientY: number) => ((clientY - col.getBoundingClientRect().top) / HOUR) * 60;
  const colIndexAt = (clientX: number) => {
    const rects = cols.current.map((c) => c?.getBoundingClientRect());
    const hit = rects.findIndex((r) => r && clientX >= r.left && clientX < r.right);
    if (hit >= 0) return hit;
    return clientX < (rects[0]?.left ?? 0) ? 0 : 6;
  };

  // --- Создание нового события на свободном месте ---
  function onColDown(e: ReactPointerEvent<HTMLDivElement>, day: string) {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const raw = clamp(minutesAt(e.currentTarget, e.clientY), 0, DAY_MIN - 1);
    if (e.pointerType === "mouse") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setOp({ kind: "create", day, a: raw, b: raw });
    } else {
      tap.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, raw };
    }
  }
  function onColMove(e: ReactPointerEvent<HTMLDivElement>) {
    const o = opRef.current;
    if (o?.kind !== "create") return;
    setOp({ ...o, b: clamp(minutesAt(e.currentTarget, e.clientY), 0, DAY_MIN) });
  }
  function onColUp(e: ReactPointerEvent<HTMLDivElement>, day: string) {
    const o = opRef.current;
    if (o?.kind === "create") {
      setOp(null);
      let start = floorTo(Math.min(o.a, o.b)), end = ceilTo(Math.max(o.a, o.b));
      if (end - start < 30) end = start + 60; // нажатие без протяжки: час по умолчанию
      if (end > DAY_MIN) { end = DAY_MIN; start = Math.max(0, end - 60); }
      onCreate(day, start, end);
      return;
    }
    const t = tap.current;
    tap.current = null;
    if (t && e.pointerType !== "mouse" && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8 && e.timeStamp - t.t < 450) {
      const start = clamp(floorTo(t.raw, 30), 0, DAY_MIN - 60);
      onCreate(day, start, start + 60);
    }
  }

  // --- Перетаскивание блока (мышь) ---
  function onBlockDown(e: ReactPointerEvent<HTMLDivElement>, ev: CalendarEvent, day: string, start: number, end: number) {
    if (e.button !== 0 || e.pointerType !== "mouse") return; // на телефоне блок открывается нажатием
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { kind: "move", ev, key: keyOf(ev), day, start, end, grab: e.clientY - e.currentTarget.getBoundingClientRect().top, x0: e.clientX, y0: e.clientY, moved: false };
  }
  function onBlockMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.kind !== "move") return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.moved = true;
    const idx = colIndexAt(e.clientX);
    const col = cols.current[idx];
    if (!col) return;
    const duration = d.end - d.start;
    const start = clamp(roundTo(minutesAt(col, e.clientY - d.grab)), 0, DAY_MIN - duration);
    setOp({ kind: "move", key: d.key, day: days[idx], start, end: start + duration });
  }
  function onBlockUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || d.kind !== "move" || !d.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const o = opRef.current;
    setOp(null);
    if (o?.kind === "move" && (o.day !== d.day || o.start !== d.start)) onChangeTimes(d.ev, o.day, o.start, o.end);
  }

  // --- Растягивание блока за нижний край ---
  function onResizeDown(e: ReactPointerEvent<HTMLElement>, ev: CalendarEvent, day: string, start: number, end: number) {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { kind: "resize", ev, key: keyOf(ev), day, start, end, grab: 0, x0: e.clientX, y0: e.clientY, moved: false };
  }
  function onResizeMove(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    const col = d ? cols.current[days.indexOf(d.day)] : null;
    if (!d || d.kind !== "resize" || !col) return;
    d.moved = true;
    setOp({ kind: "resize", key: d.key, end: clamp(roundTo(minutesAt(col, e.clientY)), d.start + SNAP, DAY_MIN) });
  }
  function onResizeUp(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const o = opRef.current;
    setOp(null);
    if (!d || d.kind !== "resize" || !d.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (o?.kind === "resize" && o.end !== d.end) onChangeTimes(d.ev, d.day, d.start, o.end);
  }

  const blocks = timed.map((ev) => ({ ev, ...placed(ev) })).filter((x) => days.includes(x.day));
  const lanesByDay = new Map(days.map((day) => [day, layoutDay(blocks.filter((x) => x.day === day).map((x) => ({ id: keyOf(x.ev), start: x.start, end: Math.max(x.end, x.start + MIN_LAYOUT) })))]));

  return (
    <div ref={scroller} className="cw-scroll" role="grid" aria-label="Неделя">
      <div className="cw-inner">
        <div className="cw-top">
          <div className="cw-row">
            <div className="cw-axis-cell" />
            {days.map((d, i) => (
              <div key={d} className={cn("cw-dayhead", d === today && "is-today")} role="columnheader" aria-label={fullDate(d)}>
                <span>{WEEKDAYS[i]}</span>
                <b>{Number(d.slice(8))}</b>
              </div>
            ))}
          </div>
          <div className="cw-row cw-allday">
            <div className="cw-axis-cell cw-allday-label">весь день</div>
            {days.map((d) => {
              const evs = allDay(d), tds = todosOn(d);
              const shown = 3;
              const extra = Math.max(0, evs.length + tds.length - shown);
              return (
                <div key={d} className="cw-allday-cell" onDoubleClick={() => onCreateAllDay(d)} title="Двойной клик: пометка на весь день">
                  {evs.slice(0, shown).map((ev) => (
                    <div key={keyOf(ev)} role="button" tabIndex={0} className="cal-chip" style={evStyle(colorHex(ev.color))} title={ev.title}
                      onClick={() => onEdit(ev)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(ev); } }}>
                      {ev.repeat && ev.repeat !== "none" ? "↻ " : ""}{ev.title}
                    </div>
                  ))}
                  {tds.slice(0, Math.max(0, shown - evs.length)).map((t) => (
                    <div key={t.id} role="button" tabIndex={0} className={cn("cal-chip cal-chip-todo", t.done_at && "is-done")} style={evStyle(colorHex(t.color ?? "gray"))} title={`Дело: ${cleanTodoTitle(t.title)}`}
                      onClick={onOpenTodos} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpenTodos(); } }}>
                      {t.done_at ? "✓ " : "☐ "}{cleanTodoTitle(t.title)}
                    </div>
                  ))}
                  {extra > 0 && <span className="cal-more">+{extra} ещё</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cw-body" style={{ height: px(DAY_MIN) }}>
          <div className="cw-axis" aria-hidden="true">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => <span key={h} className="cw-hour" style={{ top: px(h * 60) }}>{String(h).padStart(2, "0")}:00</span>)}
          </div>
          {days.map((day, idx) => {
            const preview = op?.kind === "create" && op.day === day ? { start: floorTo(Math.min(op.a, op.b)), end: Math.max(ceilTo(Math.max(op.a, op.b)), floorTo(Math.min(op.a, op.b)) + SNAP) } : null;
            return (
              <div
                key={day}
                ref={(el) => { cols.current[idx] = el; }}
                role="gridcell"
                aria-label={fullDate(day)}
                className={cn("cw-col", day === today && "is-today")}
                onPointerDown={(e) => onColDown(e, day)}
                onPointerMove={onColMove}
                onPointerUp={(e) => onColUp(e, day)}
                onPointerCancel={() => { tap.current = null; if (opRef.current?.kind === "create") setOp(null); }}
              >
                {preview && <div className="cw-ghost" style={{ top: px(preview.start), height: px(preview.end - preview.start) }}><span>{minToTime(preview.start)}–{minToTime(preview.end)}</span></div>}
                {day === today && <div className="cw-now" style={{ top: px(nowMin) }} aria-hidden="true"><i /></div>}
              </div>
            );
          })}

          {/* Блоки лежат в общем слое, поэтому при переносе на другой день элемент не пересоздаётся */}
          <div className="cw-blocks">
            {blocks.map(({ ev, day, start, end }) => {
              const k = keyOf(ev);
              const pos = lanesByDay.get(day)?.get(k) ?? { lane: 0, lanes: 1 };
              const dayIdx = days.indexOf(day);
              const dragging = (op?.kind === "move" || op?.kind === "resize") && op.key === k;
              const short = end - start < 45;
              return (
                <div
                  key={k}
                  role="button"
                  tabIndex={0}
                  aria-label={`${ev.title}, ${minToTime(start)}–${minToTime(end)}`}
                  className={cn("cw-block", short && "is-short", dragging && "is-dragging")}
                  style={{ ...evStyle(colorHex(ev.color)), top: px(start), height: Math.max(px(end - start) - 2, 18), left: `calc((${dayIdx} + ${pos.lane} / ${pos.lanes}) * 100% / 7 + 1px)`, width: `calc(100% / 7 / ${pos.lanes} - 3px)` }}
                  onPointerDown={(e) => onBlockDown(e, ev, day, start, end)}
                  onPointerMove={onBlockMove}
                  onPointerUp={onBlockUp}
                  onPointerCancel={() => { dragRef.current = null; setOp(null); }}
                  onClick={() => { if (!suppressClick.current) onEdit(ev); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(ev); } }}
                >
                  {short
                    ? <span className="cw-line"><em>{minToTime(start)}</em> {ev.repeat && ev.repeat !== "none" ? "↻ " : ""}{ev.title}</span>
                    : <><b>{ev.repeat && ev.repeat !== "none" ? "↻ " : ""}{ev.title}</b><span>{minToTime(start)}–{minToTime(end)}</span></>}
                  <i className="cw-resize" aria-hidden="true" onPointerDown={(e) => onResizeDown(e, ev, day, start, end)} onPointerMove={onResizeMove} onPointerUp={onResizeUp} onPointerCancel={() => { dragRef.current = null; setOp(null); }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
