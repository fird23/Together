import { db } from "@/lib/supabase";
import { dbError } from "@/lib/errors";
import { generateInviteToken, sha256Hex } from "@/lib/invite";
import type { InvitePreview, InviteState } from "@/types";

/** Создаёт пару и первое приглашение. Возвращает токен — он показывается только сейчас. */
export async function createCouple(startDate: string): Promise<string> {
  const token = generateInviteToken();
  const { error } = await db().rpc("create_couple_with_invitation", {
    p_start_date: startDate,
    p_token_hash: await sha256Hex(token),
  });
  if (error) throw dbError(error);
  return token;
}

/** Выпускает новую ссылку; прежняя перестаёт работать. */
export async function regenerateInvitation(coupleId: string): Promise<string> {
  const token = generateInviteToken();
  const { error } = await db().rpc("create_invitation", {
    p_couple_id: coupleId,
    p_token_hash: await sha256Hex(token),
  });
  if (error) throw dbError(error);
  return token;
}

export async function revokeInvitation() {
  const { error } = await db().rpc("revoke_invitation");
  if (error) throw dbError(error);
}

/** Когда истекает активная ссылка моей пары (null — активной ссылки нет). */
export async function getPendingInvitationExpiry(): Promise<string | null> {
  const { data, error } = await db().rpc("my_pending_invitation");
  if (error) throw dbError(error);
  return (data as string | null) ?? null;
}

export async function previewInvitation(token: string): Promise<InvitePreview> {
  const { data, error } = await db().rpc("get_invitation_preview", { p_token_hash: await sha256Hex(token) });
  if (error) throw dbError(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { state: InviteState; inviter_name: string | null; start_date: string | null; expires_at: string | null }
    | undefined;
  if (!row) return { state: "not_found", inviterName: null, startDate: null, expiresAt: null };
  return { state: row.state, inviterName: row.inviter_name, startDate: row.start_date, expiresAt: row.expires_at };
}

export async function acceptInvitation(token: string) {
  const { error } = await db().rpc("accept_invitation", { p_token_hash: await sha256Hex(token) });
  if (error) throw dbError(error);
}

export async function updateStartDate(coupleId: string, startDate: string) {
  const { data, error } = await db()
    .from("couples")
    .update({ start_date: startDate, updated_at: new Date().toISOString() })
    .eq("id", coupleId)
    .select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw dbError({ message: "Не удалось сохранить дату." });
}

export async function dissolveCouple() {
  const { error } = await db().rpc("dissolve_couple");
  if (error) throw dbError(error);
}
