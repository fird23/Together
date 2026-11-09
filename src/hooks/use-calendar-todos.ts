"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { listTodosInRange } from "@/services/todos";
import type { Todo } from "@/types";

/** Дела пары со сроком в отрезке [from, to] (YYYY-MM-DD): они показываются в календаре вместе с пометками. */
export function useCalendarTodos(from: string, to: string, enabled = true) {
  const { couple } = useWorkspace();
  const [todos, setTodos] = useState<Todo[]>([]);

  const reload = useCallback(async () => {
    if (!couple || !enabled) { setTodos([]); return; }
    try { setTodos(await listTodosInRange(couple.id, from, to)); }
    catch { /* календарь работает и без дел, если миграция списка дел не применена */ }
  }, [couple, from, to, enabled]);

  useEffect(() => { void reload(); }, [reload]);
  useRealtime("todos", reload, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) && enabled });

  return { todos, reload };
}
