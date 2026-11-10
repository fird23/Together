import { addDays } from "@/utils/days";
import { STREAK_GAP_DAYS, diffDays, isAutoFrozen } from "@/utils/habit-stats";

/**
 * Общая серия: сколько дней с отметкой хотя бы одной привычки в текущей серии. Пропущенные дни замораживаются сами,
 * серия сгорает, только если подряд прошёл месяц без единой отметки.
 */
export function overallStreak(days: Set<string>, today: string): { current: number; best: number } {
  const sorted = [...days].filter((d) => d <= today).sort();
  if (sorted.length === 0) return { current: 0, best: 0 };
  let run = 0, best = 0, prev: string | null = null;
  for (const d of sorted) {
    run = prev && diffDays(prev, d) <= STREAK_GAP_DAYS ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const alive = diffDays(prev as string, today) <= STREAK_GAP_DAYS;
  return { current: alive ? run : 0, best };
}

/** Серия пары: дни подряд, в которые отметили хотя бы по одной привычке оба. */
export function pairOverallStreak(a: Set<string>, b: Set<string>, today: string): number {
  const both = new Set([...a].filter((d) => b.has(d)));
  return overallStreak(both, today).current;
}

export const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
export const nextMilestone = (n: number) => MILESTONES.find((m) => m > n) ?? null;
export const prevMilestone = (n: number) => [...MILESTONES].reverse().find((m) => m <= n) ?? 0;

export const WEEKDAY_FULL = ["понедельник", "вторник", "среду", "четверг", "пятницу", "субботу", "воскресенье"];

export type DayState = "done" | "frozen" | "off" | "miss" | "future";
type Sched = { week_days?: number[] | null; per_week?: number | null };

/** Состояние привычки по каждому из `n` дней, заканчивая днём `endIso` (для точек в строке привычки). */
export function recentDays(s: Sched, done: Set<string>, frozen: Set<string>, endIso: string, today: string, n = 7): { iso: string; state: DayState }[] {
  const kindCount = Boolean(s.per_week);
  const scheduled = (iso: string) => !s.week_days || s.week_days.length === 0 || s.week_days.length >= 7 || s.week_days.includes(((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1);
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(endIso, i - (n - 1));
    const state: DayState = iso > today ? "future" : done.has(iso) ? "done" : frozen.has(iso) || (!kindCount && scheduled(iso) && isAutoFrozen(done, iso, today)) ? "frozen" : !kindCount && !scheduled(iso) ? "off" : kindCount ? "off" : "miss";
    return { iso, state };
  });
}

/** Сколько привычек запланировано на день и сколько отмечено. Для «N в неделю» день считается, только если привычка в этот день выполнена. */
export function dayProgress(
  habits: { id: string; scope: "shared" | "personal"; owner_id: string | null; week_days?: number[] | null; per_week?: number | null }[],
  userId: string,
  marks: Set<string>,
  iso: string,
): { done: number; total: number } {
  let done = 0, total = 0;
  const wd = ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1;
  for (const h of habits) {
    if (h.scope === "personal" && h.owner_id !== userId) continue;
    const isDone = marks.has(`${h.id}:${iso}`);
    const scheduled = h.per_week ? isDone : !h.week_days || h.week_days.length === 0 || h.week_days.length >= 7 || h.week_days.includes(wd);
    if (scheduled) { total++; if (isDone) done++; }
  }
  return { done, total };
}

/** Медали за серию дней подряд. */
export const MEDALS = [3, 7, 14, 30, 60, 100];
