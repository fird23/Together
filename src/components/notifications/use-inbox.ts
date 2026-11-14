"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { clearInbox, listInbox, markRead, type InboxItem } from "@/services/inbox";

/** История уведомлений текущего пользователя. Обновляется сама, когда приходит новое. */
export function useInbox() {
  const { profile } = useWorkspace();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try { setItems(await listInbox()); setFailed(false); }
    catch { setItems((prev) => prev ?? []); setFailed(true); }
  }, [profile]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("notifications", load, { filter: profile ? `user_id=eq.${profile.id}` : undefined, enabled: Boolean(profile) });

  const unread = (items ?? []).filter((i) => !i.read_at).length;

  const read = useCallback(async (ids: string[]) => {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((i) => (ids.includes(i.id) && !i.read_at ? { ...i, read_at: now } : i)) ?? prev);
    try { await markRead(ids); } catch { void load(); }
  }, [load]);

  const readAll = useCallback(() => read((items ?? []).filter((i) => !i.read_at).map((i) => i.id)), [items, read]);

  const clear = useCallback(async () => {
    setItems([]);
    try { await clearInbox(); } catch { void load(); }
  }, [load]);

  return { items, unread, failed, read, readAll, clear };
}
