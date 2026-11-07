"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { useRealtime } from "@/hooks/use-realtime";
import { listEvents } from "@/services/calendar";
import { expandEvents } from "@/utils/calendar";
import type { CalendarEvent } from "@/types";

/** Пометки пары за отрезок дат [from, to] (YYYY-MM-DD). */
export function useCalendarEvents(from: string, to: string) {
  const { couple } = useWorkspace();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!couple) return;
    try {
      setEvents(expandEvents(await listEvents(couple.id, from, to), from, to));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    }
  }, [couple, from, to]);

  useEffect(() => { void reload(); }, [reload]);
  useRealtime("calendar_events", reload, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  return { events, error, reload };
}
