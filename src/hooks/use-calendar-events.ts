"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { listEvents } from "@/services/calendar";
import type { CalendarEvent } from "@/types";

/** Пометки пары за отрезок дат [from, to] (YYYY-MM-DD). */
export function useCalendarEvents(from: string, to: string) {
  const { couple } = useWorkspace();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!couple) return;
    try {
      setEvents(await listEvents(couple.id, from, to));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    }
  }, [couple, from, to]);

  useEffect(() => { void reload(); }, [reload]);

  return { events, error, reload };
}
