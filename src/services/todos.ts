import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { Todo } from "@/types";

const COLS = "id,couple_id,created_by,title,assignee_id,due_day,done_at,done_by,created_at";

export async function listTodos(coupleId: string): Promise<Todo[]> {
  const { data, error } = await db().from("todos").select(COLS).eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(300);
  if (error) throw new AppError("Список дел не готов: примените миграцию 014_todos_talk_gratitude.sql.");
  return (data ?? []) as Todo[];
}

export async function addTodo(input: { coupleId: string; userId: string; title: string; assigneeId: string | null; dueDay: string | null }) {
  const { error } = await db().from("todos").insert({ couple_id: input.coupleId, created_by: input.userId, title: input.title.trim(), assignee_id: input.assigneeId, due_day: input.dueDay });
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
