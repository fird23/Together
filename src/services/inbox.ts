import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";

export type InboxItem = { id: string; title: string; body: string; url: string | null; tag: string | null; created_at: string; read_at: string | null };

const HINT = "Список уведомлений не готов: примените миграцию 028_notifications_inbox.sql.";

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await db().from("notifications").select("id,title,body,url,tag,created_at,read_at").order("created_at", { ascending: false }).limit(40);
  if (error) throw new AppError(HINT);
  return (data ?? []) as InboxItem[];
}

export async function markRead(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await db().from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
  if (error) throw dbError(error);
}

export async function clearInbox() {
  const { error } = await db().from("notifications").delete().not("id", "is", null);
  if (error) throw dbError(error);
}
