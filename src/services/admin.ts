import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { AdminStats, AdminTicket, AuditEntry, TicketStatus } from "@/types";

/** Администратор ли текущий пользователь. Любая ошибка (например, миграция не применена) значит «нет». */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data, error } = await db().rpc("is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

/** Отмечает, что пользователь открыл приложение (для счётчиков активности). Тихо, не чаще раза в 30 минут. */
export async function touchLastSeen(): Promise<void> {
  try {
    const key = "together:last-seen";
    const last = Number(window.localStorage.getItem(key) ?? 0);
    if (Date.now() - last < 30 * 60_000) return;
    const { error } = await db().rpc("touch_last_seen");
    if (!error) window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* не критично */
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await db().rpc("admin_stats");
  if (error) throw new AppError("Не удалось загрузить статистику: примените миграцию 025_admin_panel.sql.");
  return data as AdminStats;
}

export async function listAllTickets(status: TicketStatus | "all"): Promise<AdminTicket[]> {
  let query = db()
    .from("support_tickets")
    .select("id,kind,message,status,admin_reply,created_at,updated_at,email,display_name,meta")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw dbError(error);
  return (data ?? []) as AdminTicket[];
}

/** Ответ и/или новый статус. При новом ответе автору уходит уведомление (триггер в базе). */
export async function updateTicket(id: string, patch: { status?: TicketStatus; admin_reply?: string | null }) {
  const { error, data } = await db().from("support_tickets").update(patch).eq("id", id).select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw new AppError("Нет доступа или обращение не найдено.");
}

export async function listAudit(): Promise<AuditEntry[]> {
  const { data, error } = await db()
    .from("admin_audit_log")
    .select("id,action,target,details,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw dbError(error);
  return (data ?? []) as AuditEntry[];
}
