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
