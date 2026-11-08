import { addDays, pluralRu } from "@/utils/days";

/** Расписание привычки: каждый день, выбранные дни недели (1 = пн … 7 = вс) или N раз в неделю. */
export type Schedule = { week_days?: number[] | null; per_week?: number | null };
export type ScheduleKind = "daily" | "days" | "count";

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const isoWeekday = (iso: string) => ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1;
export const weekStart = (iso: string) => addDays(iso, -(isoWeekday(iso) - 1));
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function scheduleKind(s: Schedule): ScheduleKind {
  if (s.per_week) return "count";
  if (s.week_days && s.week_days.length > 0 && s.week_days.length < 7) return "days";
  return "daily";
}

export const isScheduled = (s: Schedule, iso: string) => scheduleKind(s) !== "days" || (s.week_days ?? []).includes(isoWeekday(iso));

/** Короткая подпись расписания для строки привычки; для «каждый день» подписи нет. */
export function scheduleLabel(s: Schedule): string | null {
  const kind = scheduleKind(s);
  if (kind === "count") return `${s.per_week} ${pluralRu(s.per_week ?? 0, ["раз", "раза", "раз"])} в неделю`;
  if (kind === "days") {
    const days = [...(s.week_days ?? [])].sort((a, b) => a - b);
    if (days.join() === "1,2,3,4,5") return "По будням";
    if (days.join() === "6,7") return "По выходным";
    return days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ");
  }
  return null;
}

/** Серия: для «каждый день» и «по дням» считаются дни, для «N в неделю» считаются недели с выполненной нормой. */
export function computeStreak(s: Schedule, done: Set<string>, frozen: Set<string>, today: string): { current: number; best: number; unit: "days" | "weeks" } {
  const kind = scheduleKind(s);
  const all = [...done, ...frozen].sort();
  if (all.length === 0) return { current: 0, best: 0, unit: kind === "count" ? "weeks" : "days" };

  if (kind === "count") {
    const perWeek = new Map<string, number>();
    for (const d of done) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1);
    const thisWeek = weekStart(today);
    let run = 0, best = 0;
    for (let w = weekStart(all[0]); w <= thisWeek; w = addDays(w, 7)) {
      if ((perWeek.get(w) ?? 0) >= (s.per_week ?? 1)) run++;
      else if (w !== thisWeek) run = 0; // текущая неделя ещё не закончена и серию не рвёт
      best = Math.max(best, run);
    }
    return { current: run, best, unit: "weeks" };
  }

  let run = 0, best = 0;
  const span = Math.min(800, diffDays(all[0], today));
  for (let i = 0; i <= span; i++) {
    const d = addDays(all[0], i);
    if (done.has(d)) run++;
    else if (frozen.has(d)) { /* заморозка: серия сохраняется, но не растёт */ }
    else if (isScheduled(s, d) && d !== today) run = 0; // пропуск запланированного дня; сегодняшний ещё можно успеть
    best = Math.max(best, run);
  }
  return { current: run, best, unit: "days" };
}

/** Общая серия пары: считаются дни, когда выполнили оба. */
export function computePairStreak(s: Schedule, doneA: Set<string>, doneB: Set<string>, frozenA: Set<string>, frozenB: Set<string>, today: string): number {
  if (scheduleKind(s) === "count") return 0;
  const first = [...doneA, ...doneB].sort()[0];
  if (!first) return 0;
  let run = 0;
  const span = Math.min(800, diffDays(first, today));
  for (let i = 0; i <= span; i++) {
    const d = addDays(first, i);
    const both = doneA.has(d) && doneB.has(d);
    const covered = (doneA.has(d) || frozenA.has(d)) && (doneB.has(d) || frozenB.has(d));
    if (both) run++;
    else if (!covered && isScheduled(s, d) && d !== today) run = 0;
  }
  return run;
}

/** Выполнение за последние `days` дней, в процентах от плана расписания. */
export function completionRate(s: Schedule, done: Set<string>, today: string, days = 30): number {
  let planned = 0, made = 0;
  const kind = scheduleKind(s);
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (done.has(d)) made++;
    if (kind !== "count" && isScheduled(s, d)) planned++;
  }
  if (kind === "count") planned = Math.max(1, Math.round(((s.per_week ?? 1) * days) / 7));
  return planned === 0 ? 0 : Math.min(100, Math.round((made / planned) * 100));
}

export function weeklyCounts(done: Set<string>, today: string, weeks = 8): { start: string; count: number }[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, i * 7);
    let count = 0;
    for (let k = 0; k < 7; k++) if (done.has(addDays(start, k))) count++;
    return { start, count };
  });
}

export function weekdayCounts(done: Set<string>): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const d of done) out[isoWeekday(d) - 1]++;
  return out;
}

export type HeatCell = { iso: string; state: "done" | "frozen" | "off" | "miss" | "future" };

/** Календарь-«теплокарта»: столбцы — недели (пн–вс), последняя неделя содержит сегодня. */
export function heatmap(s: Schedule, done: Set<string>, frozen: Set<string>, today: string, weeks = 26): HeatCell[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const cells: HeatCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const iso = addDays(first, i);
    const state: HeatCell["state"] = iso > today ? "future" : done.has(iso) ? "done" : frozen.has(iso) ? "frozen" : !isScheduled(s, iso) ? "off" : "miss";
    cells.push({ iso, state });
  }
  return cells;
}

/** Нужно ли отметить привычку сегодня, и сколько раз осталось на неделе для «N в неделю». */
export function dueToday(s: Schedule, done: Set<string>, today: string): { due: boolean; weekDone: number } {
  const kind = scheduleKind(s);
  if (kind === "daily") return { due: true, weekDone: 0 };
  if (kind === "days") return { due: isScheduled(s, today), weekDone: 0 };
  const start = weekStart(today);
  let weekDone = 0;
  for (let k = 0; k < 7; k++) if (done.has(addDays(start, k))) weekDone++;
  return { due: weekDone < (s.per_week ?? 1) || done.has(today), weekDone };
}
