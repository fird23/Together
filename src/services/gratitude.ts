import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { GratitudeNote } from "@/types";

export async function listGratitude(coupleId: string): Promise<GratitudeNote[]> {
  const { data, error } = await db().from("gratitude_notes").select("id,user_id,day,text,created_at").eq("couple_id", coupleId).order("day", { ascending: false }).limit(120);
  if (error) throw new AppError("Благодарности не готовы: примените миграцию 014_todos_talk_gratitude.sql.");
  return (data ?? []) as GratitudeNote[];
}

/** Одна запись в день на человека: повторное сохранение заменяет текст. */
export async function saveGratitude(coupleId: string, userId: string, day: string, text: string) {
  const { error } = await db().from("gratitude_notes").upsert({ couple_id: coupleId, user_id: userId, day, text: text.trim() }, { onConflict: "couple_id,user_id,day" });
  if (error) throw dbError(error);
}
