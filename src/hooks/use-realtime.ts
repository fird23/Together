"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Вызывает onChange, когда в таблице что-то изменилось (например, партнёр отметил привычку).
 * Требует, чтобы таблица была в публикации supabase_realtime (миграция 014). Изменения пачкой склеиваются.
 *
 * Подписки общие: на одну таблицу с одним фильтром открывается один канал, сколько бы блоков на странице
 * ни слушали эту таблицу. Канал закрывается, когда уходит последний слушатель.
 */
type Shared = { channel: RealtimeChannel; listeners: Set<() => void> };
const shared = new Map<string, Shared>();

function subscribe(table: string, filter: string | undefined, listener: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const key = `${table}|${filter ?? ""}`;
  let entry = shared.get(key);
  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = client
      .channel(`rt:${table}:${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => {
        for (const fn of [...listeners]) fn();
      })
      .subscribe();
    entry = { channel, listeners };
    shared.set(key, entry);
  }
  entry.listeners.add(listener);
  const current = entry;
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      shared.delete(key);
      void client.removeChannel(current.channel);
    }
  };
}

export function useRealtime(table: string, onChange: () => void, options: { filter?: string; enabled?: boolean } = {}) {
  const { filter, enabled = true } = options;
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; });

  useEffect(() => {
    if (!supabase || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribe(table, filter, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 200);
    });
    return () => { if (timer) clearTimeout(timer); unsubscribe(); };
  }, [table, filter, enabled]);
}
