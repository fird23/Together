import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { SupportTicket, TicketKind } from "@/types";

export async function sendTicket(input: {
  userId: string;
  email: string;
  displayName: string;
  kind: TicketKind;
  message: string;
  meta: Record<string, string> | null;
}) {
  const { error } = await db().from("support_tickets").insert({
    user_id: input.userId,
    email: input.email,
    display_name: input.displayName,
    kind: input.kind,
    message: input.message.trim(),
    meta: input.meta,
  });
  if (error) throw dbError(error);
}

export async function listMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await db()
    .from("support_tickets")
    .select("id,kind,message,status,admin_reply,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new AppError("Поддержка не готова: примените миграцию 011_support_tickets.sql.");
  return (data ?? []) as SupportTicket[];
}
