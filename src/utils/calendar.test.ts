import { describe, expect, it } from "vitest";
import { eventsInRange, eventsOnDay, expandEvents, layoutDay, minToTime, timeRange, timeToMin } from "@/utils/calendar";
import type { CalendarEvent } from "@/types";

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e1", couple_id: "c1", created_by: null, title: "Событие", note: null, color: "rose",
  start_day: "2026-11-02", end_day: "2026-11-02", repeat: "none", ...over,
});

describe("пометки по дням", () => {
  const trip = ev({ start_day: "2026-11-10", end_day: "2026-11-12" });
  it("многодневная пометка видна во все свои дни", () => {
    expect(eventsOnDay([trip], "2026-11-10")).toHaveLength(1);
    expect(eventsOnDay([trip], "2026-11-12")).toHaveLength(1);
    expect(eventsOnDay([trip], "2026-11-13")).toHaveLength(0);
  });
  it("пересечение с отрезком", () => {
    expect(eventsInRange([trip], "2026-11-12", "2026-11-20")).toHaveLength(1);
    expect(eventsInRange([trip], "2026-11-13", "2026-11-20")).toHaveLength(0);
  });
});

describe("повторы", () => {
  it("без повтора остаётся как есть", () => {
    const out = expandEvents([ev({})], "2026-11-01", "2026-11-30");
    expect(out).toHaveLength(1);
    expect(out[0].series_start).toBe("2026-11-02");
  });
  it("каждую неделю", () => {
    const out = expandEvents([ev({ repeat: "weekly" })], "2026-11-01", "2026-11-30");
    expect(out.map((e) => e.start_day)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("каждый месяц: 31-е в коротком месяце попадает на последний день", () => {
    const out = expandEvents([ev({ repeat: "monthly", start_day: "2026-01-31", end_day: "2026-01-31" })], "2026-01-01", "2026-04-30");
    expect(out.map((e) => e.start_day)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("каждый год", () => {
    const out = expandEvents([ev({ repeat: "yearly", start_day: "2024-11-18", end_day: "2024-11-18" })], "2026-01-01", "2027-12-31");
    expect(out.map((e) => e.start_day)).toEqual(["2026-11-18", "2027-11-18"]);
  });
  it("многодневный повтор сохраняет длину", () => {
    const out = expandEvents([ev({ repeat: "weekly", start_day: "2026-11-02", end_day: "2026-11-04" })], "2026-11-08", "2026-11-14");
    expect(out).toHaveLength(1);
    expect(out[0].start_day).toBe("2026-11-09");
    expect(out[0].end_day).toBe("2026-11-11");
  });
  it("повтор, который начался до отрезка и ещё идёт, попадает в выдачу", () => {
    const out = expandEvents([ev({ repeat: "weekly", start_day: "2026-11-02", end_day: "2026-11-09" })], "2026-11-10", "2026-11-12");
    expect(out.length).toBeGreaterThan(0);
  });
  it("сортирует по дню и времени", () => {
    const a = ev({ id: "a", start_day: "2026-11-05", end_day: "2026-11-05", start_time: "15:00", end_time: "16:00" });
    const b = ev({ id: "b", start_day: "2026-11-05", end_day: "2026-11-05", start_time: "09:00", end_time: "10:00" });
    expect(expandEvents([a, b], "2026-11-01", "2026-11-30").map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("время", () => {
  it("переводит туда и обратно", () => {
    expect(timeToMin("09:30")).toBe(570);
    expect(minToTime(570)).toBe("09:30");
  });
  it("конец суток ограничен 23:59", () => {
    expect(minToTime(1440)).toBe("23:59");
    expect(minToTime(-5)).toBe("00:00");
  });
  it("подпись диапазона только при обоих временах", () => {
    expect(timeRange({ start_time: "09:00", end_time: "10:30" })).toBe("09:00–10:30");
    expect(timeRange({ start_time: "09:00", end_time: null })).toBe("");
  });
});

describe("раскладка событий дня", () => {
  it("пересекающиеся встают в разные дорожки", () => {
    const out = layoutDay([{ id: "a", start: 540, end: 660 }, { id: "b", start: 600, end: 720 }]);
    expect(out.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(out.get("b")).toEqual({ lane: 1, lanes: 2 });
  });
  it("не пересекающиеся занимают всю ширину", () => {
    const out = layoutDay([{ id: "a", start: 540, end: 600 }, { id: "b", start: 600, end: 660 }]);
    expect(out.get("a")).toEqual({ lane: 0, lanes: 1 });
    expect(out.get("b")).toEqual({ lane: 0, lanes: 1 });
  });
});
