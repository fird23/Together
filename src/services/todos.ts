import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { EventColor, Todo } from "@/types";

const COLS = "id,couple_id,created_by,title,assignee_id,due_day,done_at,done_by,created_at,color";

export async function listTodos(coupleId: string): Promise<Todo[]> {
  // Порядок дел хранится в sort_order (миграция 022). Если её ещё нет, список работает по времени создания.
  const ordered = await db().from("todos").select(`${COLS},sort_order`).eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(300);
  if (!ordered.error) return (ordered.data ?? []) as Todo[];
  const { data, error } = await db().from("todos").select(COLS).eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(300);
  if (error) throw new AppError("Список дел не готов: примените миграцию 014_todos_talk_gratitude.sql.");
  return (data ?? []) as Todo[];
}

/** Сохраняет новое место дела в списке (меньше число — выше). */
export async function setTodoOrder(id: string, sortOrder: number) {
  const { error } = await db().from("todos").update({ sort_order: sortOrder }).eq("id", id);
  if (error) throw dbError(error);
}

export async function addTodo(input: { coupleId: string; userId: string; title: string; assigneeId: string | null; dueDay: string | null; color?: EventColor | null }) {
  const { error } = await db().from("todos").insert({ couple_id: input.coupleId, created_by: input.userId, title: input.title.trim(), assignee_id: input.assigneeId, due_day: input.dueDay, color: input.color ?? null });
  if (error) throw dbError(error);
}

export async function setTodoDone(id: string, userId: string, done: boolean) {
  const { error } = await db().from("todos").update({ done_at: done ? new Date().toISOString() : null, done_by: done ? userId : null }).eq("id", id);
  if (error) throw dbError(error);
}

export async function removeTodo(id: string) {
  const { error } = await db().from("todos").delete().eq("id", id);
  if (error) throw dbError(error);
}

export async function updateTodo(id: string, input: { title: string; assigneeId: string | null; dueDay: string | null; color?: EventColor | null }) {
  const { error } = await db().from("todos").update({ title: input.title.trim(), assignee_id: input.assigneeId, due_day: input.dueDay, color: input.color ?? null }).eq("id", id);
  if (error) throw dbError(error);
}

/** Дела со сроком в отрезке [from, to] — для показа в календаре. */
export async function listTodosInRange(coupleId: string, from: string, to: string): Promise<Todo[]> {
  const { data, error } = await db().from("todos").select(COLS).eq("couple_id", coupleId).gte("due_day", from).lte("due_day", to).order("created_at", { ascending: true });
  if (error) throw new AppError("Не удалось загрузить дела для календаря.");
  return (data ?? []) as Todo[];
}
