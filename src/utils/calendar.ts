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
  return out.sort((a, b) => a.start_day.localeCompare(b.start_day));
}

export const dayShift = dayDiff;
export const REPEAT_LABELS = { none: "Не повторять", weekly: "Каждую неделю", monthly: "Каждый месяц", yearly: "Каждый год" } as const;
