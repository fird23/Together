import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { CalendarEvent, EventColor, EventRepeat } from "@/types";

export type EventInput = { title: string; note: string; color: EventColor; start: string; end: string; repeat: EventRepeat };

const COLUMNS = "id,couple_id,created_by,title,note,color,start_day,end_day,repeat";
const MIGRATION_HINT = "Календарь не готов: примените миграцию 010_calendar_events.sql.";

/** Пометки, пересекающиеся с отрезком [from, to]. */
export async function listEvents(coupleId: string, from: string, to: string): Promise<CalendarEvent[]> {
  const { data, error } = await db()
    .from("calendar_events")
    .select(COLUMNS)
    .eq("couple_id", coupleId)
    .lte("start_day", to)
    .or(`end_day.gte.${from},repeat.neq.none`) // повторяющиеся нужны, даже если начались давно
    .order("start_day")
    .order("created_at");
  if (error) throw new AppError(MIGRATION_HINT);
  return (data ?? []) as CalendarEvent[];
}

export async function createEvent(coupleId: string, userId: string, input: EventInput) {
  const { error } = await db().from("calendar_events").insert({
    couple_id: coupleId,
    created_by: userId,
    title: input.title.trim(),
    note: input.note.trim() || null,
    color: input.color,
    start_day: input.start,
    end_day: input.end,
    repeat: input.repeat,
  });
  if (error) throw dbError(error);
}

export async function updateEvent(id: string, input: EventInput) {
  const { data, error } = await db()
    .from("calendar_events")
    .update({ title: input.title.trim(), note: input.note.trim() || null, color: input.color, start_day: input.start, end_day: input.end, repeat: input.repeat })
    .eq("id", id)
    .select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw new AppError("Не удалось сохранить пометку.");
}

export async function deleteEvent(id: string) {
  const { error } = await db().from("calendar_events").delete().eq("id", id);
  if (error) throw dbError(error);
}
