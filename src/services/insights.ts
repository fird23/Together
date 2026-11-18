import { db } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paged";

export type WeekHabit = { id: string; scope: "shared" | "personal"; owner_id: string | null; week_days?: number[] | null; per_week?: number | null };
export type WeekMark = { habit_id: string; user_id: string; day: string };

/** Сырые данные для «Итогов недели»: привычки, отметки, выполненные дела и благодарности с даты from. */
export async function loadWeekData(coupleId: string, from: string) {
  const sb = db();
  const [habitsRes, todoRes, gratRes] = await Promise.all([
    sb.from("habits").select("id,scope,owner_id,week_days,per_week").eq("couple_id", coupleId),
    sb.from("todos").select("done_by").eq("couple_id", coupleId).not("done_at", "is", null).gte("done_at", `${from}T00:00:00`),
    sb.from("gratitude_notes").select("user_id").eq("couple_id", coupleId).gte("day", from),
  ]);
  const habits = (habitsRes.data ?? []) as WeekHabit[];
  let marks: WeekMark[] = [];
  if (habits.length) {
    const ids = habits.map((h) => h.id);
    marks = (await fetchAllRows<WeekMark>((a, b) => sb.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", ids).gte("day", from).order("day").order("habit_id").order("user_id").range(a, b))).rows;
  }
  return {
    habits,
    marks,
    todos: (todoRes.data ?? []) as { done_by: string | null }[],
    gratitude: (gratRes.data ?? []) as { user_id: string }[],
  };
}

/** Благодарности пары в выбранные даты (для «воспоминаний»). */
export async function loadGratitudeOnDays(coupleId: string, days: string[]) {
  const { data } = await db().from("gratitude_notes").select("user_id,text,day").eq("couple_id", coupleId).in("day", days);
  return (data ?? []) as { user_id: string; text: string; day: string }[];
}
