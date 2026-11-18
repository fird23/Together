import { db } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paged";

export type MoodRow = { id: string; user_id: string; mood: string; note: string | null; day: string };
export type MoodDay = { user_id: string; mood: string; day: string };

/** Записи настроения пары за один день. null — запрос не удался. */
export async function loadMoodsForDay(coupleId: string, day: string): Promise<MoodRow[] | null> {
  const { data, error } = await db().from("mood_entries").select("id,user_id,mood,note,day").eq("couple_id", coupleId).eq("day", day);
  return error ? null : ((data ?? []) as MoodRow[]);
}

/** Своё настроение на день: одна запись на человека в день. Возвращает true, если сохранилось. */
export async function saveMood(coupleId: string, userId: string, day: string, mood: string, note: string | null): Promise<boolean> {
  const { error } = await db()
    .from("mood_entries")
    .upsert({ couple_id: coupleId, user_id: userId, day, mood, note }, { onConflict: "couple_id,user_id,day" });
  return !error;
}

/** Настроение пары начиная с даты (для итогов недели). */
export async function loadMoodsSince(coupleId: string, from: string): Promise<MoodDay[]> {
  const { rows } = await fetchAllRows<MoodDay>((a, b) => db().from("mood_entries").select("user_id,mood,day").eq("couple_id", coupleId).gte("day", from).order("day").order("user_id").range(a, b));
  return rows;
}

/** Настроение пары в выбранные даты (для «воспоминаний»). */
export async function loadMoodsOnDays(coupleId: string, days: string[]): Promise<MoodDay[]> {
  const { data } = await db().from("mood_entries").select("user_id,mood,day").eq("couple_id", coupleId).in("day", days);
  return (data ?? []) as MoodDay[];
}
