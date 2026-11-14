import { addDays, addMonths } from "@/utils/days";
import type { CalendarEvent, EventColor } from "@/types";

export const EVENT_COLORS: { id: EventColor; label: string; hex: string }[] = [
  { id: "rose", label: "Розовый", hex: "#D9708E" },
  { id: "amber", label: "Жёлтый", hex: "#E9A93B" },
  { id: "green", label: "Зелёный", hex: "#6FAE6B" },
  { id: "teal", label: "Бирюзовый", hex: "#4FB3A9" },
  { id: "blue", label: "Синий", hex: "#6C8FD6" },
  { id: "violet", label: "Фиолетовый", hex: "#9A82C9" },
  { id: "orange", label: "Оранжевый", hex: "#D98B5B" },
  { id: "gray", label: "Серый", hex: "#8B90A0" },
];

export const colorHex = (id: EventColor) => EVENT_COLORS.find((c) => c.id === id)?.hex ?? "#D9708E";

export const eventsOnDay = (events: CalendarEvent[], iso: string) =>
  events.filter((e) => e.start_day <= iso && iso <= e.end_day);

export const eventsInRange = (events: CalendarEvent[], start: string, end: string) =>
  events.filter((e) => e.start_day <= end && e.end_day >= start);

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Раскладывает повторяющиеся пометки на конкретные повторы в отрезке [from, to]. */
export function expandEvents(raw: CalendarEvent[], from: string, to: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const e of raw) {
    const base = { series_start: e.start_day, series_end: e.end_day };
    const repeat = e.repeat ?? "none";
    if (repeat === "none") { out.push({ ...e, ...base }); continue; }
    const span = dayDiff(e.start_day, e.end_day);
    for (let k = 0; k < 2000; k++) {
      const start = repeat === "weekly" ? addDays(e.start_day, 7 * k) : addMonths(e.start_day, repeat === "monthly" ? k : 12 * k);
      if (start > to) break;
      const end = addDays(start, span);
      if (end >= from) out.push({ ...e, start_day: start, end_day: end, ...base });
    }
  }
  return out.sort((a, b) => a.start_day.localeCompare(b.start_day) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}

export const dayShift = dayDiff;
export const REPEAT_LABELS = { none: "Не повторять", weekly: "Каждую неделю", monthly: "Каждый месяц", yearly: "Каждый год" } as const;

/** «09:30» → минуты от начала суток. */
export const timeToMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Минуты от начала суток → «09:30» (конец суток хранится как 23:59). */
export const minToTime = (m: number) => {
  const v = Math.max(0, Math.min(m, 1439));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
export const timeRange = (e: Pick<CalendarEvent, "start_time" | "end_time">) => (e.start_time && e.end_time ? `${e.start_time}–${e.end_time}` : "");

/**
 * Раскладка событий одного дня по дорожкам: пересекающиеся стоят рядом, а не друг на друге.
 * Возвращает для каждого id номер дорожки и число дорожек в его группе пересечений.
 */
export function layoutDay(items: { id: string; start: number; end: number }[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: typeof sorted = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    const lane = new Map<string, number>();
    for (const it of cluster) {
      let l = laneEnds.findIndex((end) => end <= it.start);
      if (l < 0) { l = laneEnds.length; laneEnds.push(it.end); } else laneEnds[l] = it.end;
      lane.set(it.id, l);
    }
    for (const it of cluster) result.set(it.id, { lane: lane.get(it.id)!, lanes: laneEnds.length });
    cluster = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return result;
}
