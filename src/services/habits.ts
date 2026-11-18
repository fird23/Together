import { db } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paged";
import type { EventColor } from "@/types";

export type Habit = {
  id: string; couple_id: string; owner_id: string | null; scope: "shared" | "personal"; title: string; created_at: string;
  color?: EventColor | null; icon?: string | null; week_days?: number[] | null; per_week?: number | null;
  target_value?: number | null; unit?: string | null;
};
export type Progress = { habit_id: string; user_id: string; day: string; value: number };
export type Checkin = { habit_id: string; user_id: string; day: string };
export type Freeze = { habit_id: string; user_id: string; day: string };

export type HabitData = {
  habits: Habit[];
  checkins: Checkin[];
  freezes: Freeze[];
  progress: Progress[];
  /** Привычки не загрузились совсем. */
  failed: boolean;
  /** Привычки есть, но отметки недоступны. */
  marksFailed: boolean;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

/** Привычки пары, отметки за год, заморозки и числа за день. Отметки читаются страницами, чтобы ничего не обрезалось. */
export async function loadHabitData(coupleId: string): Promise<HabitData> {
  const client = db();
  const { data: habitRows, error } = await client.from("habits").select("*").eq("couple_id", coupleId).order("created_at", { ascending: false });
  if (error) return { habits: [], checkins: [], freezes: [], progress: [], failed: true, marksFailed: false };
  const habits = (habitRows ?? []) as Habit[];
  if (habits.length === 0) return { habits, checkins: [], freezes: [], progress: [], failed: false, marksFailed: false };

  const ids = habits.map((h) => h.id);
  const cutoff = daysAgo(365);
  const since = daysAgo(120);
  const [marks, frozen, prog] = await Promise.all([
    fetchAllRows<Checkin>((from, to) => client.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", ids).gte("day", cutoff).order("day").order("habit_id").order("user_id").range(from, to)),
    fetchAllRows<Freeze>((from, to) => client.from("habit_freezes").select("habit_id,user_id,day").in("habit_id", ids).gte("day", cutoff).order("day").order("habit_id").order("user_id").range(from, to)),
    // Числа за день для привычек с нормой. Если миграция 023 ещё не применена, просто нет данных.
    fetchAllRows<Progress>((from, to) => client.from("habit_progress").select("habit_id,user_id,day,value").in("habit_id", ids).gte("day", since).order("day").order("habit_id").order("user_id").range(from, to)),
  ]);
  return {
    habits,
    checkins: marks.rows,
    freezes: frozen.error ? [] : frozen.rows,
    progress: prog.error ? [] : prog.rows.map((p) => ({ ...p, value: Number(p.value) })),
    failed: false,
    marksFailed: Boolean(marks.error),
  };
}

export async function insertHabit(row: Record<string, unknown>): Promise<boolean> {
  const { error } = await db().from("habits").insert(row);
  return !error;
}

/** Ставит или снимает обычную отметку. Возвращает true, если получилось. */
export async function setHabitCheckin(habitId: string, userId: string, day: string, checked: boolean): Promise<boolean> {
  const table = db().from("habit_checkins");
  const { error } = checked
    ? await table.insert({ habit_id: habitId, user_id: userId, day })
    : await table.delete().eq("habit_id", habitId).eq("user_id", userId).eq("day", day);
  return !error;
}

/** Сохраняет число за день: база сама ставит или снимает отметку «выполнено» по норме. Возвращает, достигнута ли норма. */
export async function saveHabitProgress(habitId: string, day: string, value: number): Promise<boolean> {
  const { data, error } = await db().rpc("set_habit_progress", { p_habit: habitId, p_day: day, p_value: value });
  if (error) throw new Error("progress failed");
  return data === true;
}

export async function updateHabitRow(id: string, fields: Record<string, unknown>): Promise<void> {
  const { data, error } = await db().from("habits").update(fields).eq("id", id).select("id");
  if (error) throw new Error(error.message || "Неизвестная ошибка базы данных.");
  if (!data?.length) throw new Error("Изменение не сохранено: база данных не вернула обновлённую запись. Проверьте права доступа (RLS) и членство в паре.");
}

export async function deleteHabitRow(id: string): Promise<boolean> {
  const { error } = await db().from("habits").delete().eq("id", id);
  return !error;
}
