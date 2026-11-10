import { addDays, pluralRu } from "@/utils/days";

/** Расписание привычки: каждый день, выбранные дни недели (1 = пн … 7 = вс) или N раз в неделю. */
export type Schedule = { week_days?: number[] | null; per_week?: number | null };
export type ScheduleKind = "daily" | "days" | "count";

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const isoWeekday = (iso: string) => ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1;
export const weekStart = (iso: string) => addDays(iso, -(isoWeekday(iso) - 1));
export const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Заморозка автоматическая и без лимита: пропущенный день не обрывает серию, пока после последней отметки
 * прошло не больше STREAK_GAP_DAYS дней. Если целый месяц нет ни одной отметки, серия сгорает и начинается заново.
 */
export const STREAK_GAP_DAYS = 30;

/** Заморожен ли день сам: он уже прошёл, не отмечен, и последняя отметка была не позднее месяца назад. */
export function isAutoFrozen(done: Set<string>, iso: string, today: string): boolean {
  if (iso >= today || done.has(iso)) return false;
  for (let k = 1; k <= STREAK_GAP_DAYS; k++) if (done.has(addDays(iso, -k))) return true;
  return false;
}

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

/** Серия: для «каждый день» и «по дням» считаются дни с отметкой, для «N в неделю» считаются недели с выполненной нормой. Пропуски замораживаются сами. */
export function computeStreak(s: Schedule, done: Set<string>, frozen: Set<string>, today: string): { current: number; best: number; unit: "days" | "weeks" } {
  const kind = scheduleKind(s);
  const all = [...done, ...frozen].sort();
  if (all.length === 0) return { current: 0, best: 0, unit: kind === "count" ? "weeks" : "days" };

  if (kind === "count") {
    const perWeek = new Map<string, number>();
    for (const d of done) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1);
    const marks = [...done].sort();
    const thisWeek = weekStart(today);
    let run = 0, best = 0, k = 0, last: string | null = null;
    for (let w = weekStart(all[0]); w <= thisWeek; w = addDays(w, 7)) {
      const end = addDays(w, 6);
      while (k < marks.length && marks[k] <= end) last = marks[k++];
      if ((perWeek.get(w) ?? 0) >= (s.per_week ?? 1)) run++;
      else if (w !== thisWeek && !(last && diffDays(last, end) <= STREAK_GAP_DAYS)) run = 0; // неделя без нормы заморожена, пока не прошёл месяц без отметок
      best = Math.max(best, run);
    }
    if (!last || diffDays(last, today) > STREAK_GAP_DAYS) run = 0; // больше месяца без отметок: серия сгорела
    return { current: run, best, unit: "weeks" };
  }

  let run = 0, best = 0, last: string | null = null;
  const span = Math.min(800, diffDays(all[0], today));
  for (let i = 0; i <= span; i++) {
    const d = addDays(all[0], i);
    if (done.has(d)) { run++; last = d; }
    else if (frozen.has(d)) { /* старая ручная заморозка: серия сохраняется */ }
    else if (isScheduled(s, d) && d !== today && !(last && diffDays(last, d) <= STREAK_GAP_DAYS)) run = 0; // месяц без отметок
    best = Math.max(best, run);
  }
  if (!last || diffDays(last, today) > STREAK_GAP_DAYS) run = 0; // больше месяца без отметок: серия сгорела, даже если сегодня ещё не отмечено
  return { current: run, best, unit: "days" };
}

/** Общая серия пары: считаются дни, когда выполнили оба; пропуск замораживается, пока у каждого была отметка в последний месяц. */
export function computePairStreak(s: Schedule, doneA: Set<string>, doneB: Set<string>, frozenA: Set<string>, frozenB: Set<string>, today: string): number {
  if (scheduleKind(s) === "count") return 0;
  const first = [...doneA, ...doneB].sort()[0];
  if (!first) return 0;
  let run = 0, lastA: string | null = null, lastB: string | null = null;
  const span = Math.min(800, diffDays(first, today));
  for (let i = 0; i <= span; i++) {
    const d = addDays(first, i);
    if (doneA.has(d)) lastA = d;
    if (doneB.has(d)) lastB = d;
    if (doneA.has(d) && doneB.has(d)) { run++; continue; }
    if (!isScheduled(s, d) || d === today) continue;
    const alive = (done: Set<string>, frozen: Set<string>, last: string | null) => done.has(d) || frozen.has(d) || Boolean(last && diffDays(last, d) <= STREAK_GAP_DAYS);
    if (!(alive(doneA, frozenA, lastA) && alive(doneB, frozenB, lastB))) run = 0;
  }
  const gone = (last: string | null) => !last || diffDays(last, today) > STREAK_GAP_DAYS;
  return gone(lastA) || gone(lastB) ? 0 : run;
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
    const state: HeatCell["state"] = iso > today ? "future" : done.has(iso) ? "done" : frozen.has(iso) || (isScheduled(s, iso) && isAutoFrozen(done, iso, today)) ? "frozen" : !isScheduled(s, iso) ? "off" : "miss";
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
