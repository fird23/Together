import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { CalendarEvent, EventColor, EventRepeat } from "@/types";

export type EventInput = {
  title: string; note: string; color: EventColor; start: string; end: string; repeat: EventRepeat;
  /** Время (HH:MM). Если не задано, событие на весь день. */
  startTime?: string | null; endTime?: string | null;
  /** Снять время у события, которое раньше было со временем (сделать его пометкой на весь день). */
  clearTime?: boolean;
};

const COLUMNS = "id,couple_id,created_by,title,note,color,start_day,end_day,repeat";
const MIGRATION_HINT = "Календарь не готов: примените миграцию 010_calendar_events.sql.";

const hhmm = (t: unknown) => (typeof t === "string" && t.length >= 5 ? t.slice(0, 5) : null);

/** Пометки, пересекающиеся с отрезком [from, to]. */
export async function listEvents(coupleId: string, from: string, to: string): Promise<CalendarEvent[]> {
  const run = (columns: string) =>
    db()
      .from("calendar_events")
      .select(columns)
      .eq("couple_id", coupleId)
      .lte("start_day", to)
      .or(`end_day.gte.${from},repeat.neq.none`) // повторяющиеся нужны, даже если начались давно
      .order("start_day")
      .order("created_at");
  let { data, error } = await run(`${COLUMNS},start_time,end_time`);
  if (error) ({ data, error } = await run(COLUMNS)); // миграция 031 ещё не применена: события без времени
  if (error) throw new AppError(MIGRATION_HINT);
  return ((data ?? []) as unknown as CalendarEvent[]).map((e) => ({ ...e, start_time: hhmm(e.start_time), end_time: hhmm(e.end_time) }));
}

/** Колонки времени отправляем, только когда они нужны: без миграции 031 обычные пометки сохраняются как раньше. */
const timeColumns = (input: EventInput) =>
  input.startTime && input.endTime ? { start_time: input.startTime, end_time: input.endTime } : input.clearTime ? { start_time: null, end_time: null } : {};

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
    ...timeColumns(input),
  });
  if (error) throw error.message?.includes("start_time") ? new AppError("Для событий со временем примените миграцию 031_calendar_event_times.sql.") : dbError(error);
}

export async function updateEvent(id: string, input: EventInput) {
  const { data, error } = await db()
    .from("calendar_events")
    .update({ title: input.title.trim(), note: input.note.trim() || null, color: input.color, start_day: input.start, end_day: input.end, repeat: input.repeat, ...timeColumns(input) })
    .eq("id", id)
    .select("id");
  if (error) throw error.message?.includes("start_time") ? new AppError("Для событий со временем примените миграцию 031_calendar_event_times.sql.") : dbError(error);
  if (!data?.length) throw new AppError("Не удалось сохранить пометку.");
}

export async function deleteEvent(id: string) {
  const { error } = await db().from("calendar_events").delete().eq("id", id);
  if (error) throw dbError(error);
}
