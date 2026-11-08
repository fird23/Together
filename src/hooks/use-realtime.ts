"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Вызывает onChange, когда в таблице что-то изменилось (например, партнёр отметил привычку).
 * Требует, чтобы таблица была в публикации supabase_realtime (миграция 014). Изменения пачкой склеиваются.
 */
export function useRealtime(table: string, onChange: () => void, options: { filter?: string; enabled?: boolean } = {}) {
  const { filter, enabled = true } = options;
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; });

  useEffect(() => {
    if (!supabase || !enabled) return;
    const client = supabase;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = client
      .channel(`rt:${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback.current(), 200);
      })
      .subscribe();
    return () => { if (timer) clearTimeout(timer); void client.removeChannel(channel); };
  }, [table, filter, enabled]);
}
