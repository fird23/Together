import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import { compressImage } from "@/lib/image";
import { LONG_CACHE, signedUrls } from "@/lib/signed-urls";
import type { SupportTicket, TicketKind } from "@/types";

export const SUPPORT_BUCKET = "support-media";
export const MAX_ATTACHMENTS = 5;

/** Сжимает и загружает фото к обращению. Возвращает пути файлов. Если дальше что-то пойдёт не так, их нужно удалить (removeSupportImages). */
export async function uploadSupportImages(userId: string, files: File[]): Promise<string[]> {
  const storage = db().storage.from(SUPPORT_BUCKET);
  const paths: string[] = [];
  try {
    for (const file of files) {
      const blob = await compressImage(file, { maxSide: 1600, maxBytes: 700 * 1024 });
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await storage.upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: LONG_CACHE });
      if (error) throw new AppError("Не удалось загрузить фото. Примените миграцию 030_support_attachments.sql или попробуйте ещё раз.");
      paths.push(path);
    }
  } catch (e) {
    if (paths.length) await storage.remove(paths);
    throw e;
  }
  return paths;
}

export async function removeSupportImages(paths: string[]) {
  if (paths.length) await db().storage.from(SUPPORT_BUCKET).remove(paths);
}

export async function supportImageUrls(paths: string[]): Promise<Record<string, string>> {
  return signedUrls(SUPPORT_BUCKET, paths);
}

export async function sendTicket(input: {
  userId: string;
  email: string;
  displayName: string;
  kind: TicketKind;
  message: string;
  meta: Record<string, string> | null;
  attachments?: string[];
}) {
  const { error } = await db().from("support_tickets").insert({
    user_id: input.userId,
    email: input.email,
    display_name: input.displayName,
    kind: input.kind,
    message: input.message.trim(),
    meta: input.meta,
    // Колонку отправляем, только если есть вложения: без миграции 030 обычные обращения продолжают работать.
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
  });
  if (error) throw dbError(error);
}

export async function listMyTickets(): Promise<SupportTicket[]> {
  const base = "id,kind,message,status,admin_reply,created_at";
  const run = (columns: string) => db().from("support_tickets").select(columns).order("created_at", { ascending: false }).limit(30);
  let { data, error } = await run(`${base},attachments`);
  if (error) ({ data, error } = await run(base)); // миграция 030 ещё не применена
  if (error) throw new AppError("Поддержка не готова: примените миграцию 011_support_tickets.sql.");
  return (data ?? []) as unknown as SupportTicket[];
}
