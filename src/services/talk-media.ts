import { db } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

export const TALK_BUCKET = "talk-media";

/** Загружает сжатое фото в закрытое хранилище пары и возвращает путь. */
export async function uploadTalkImage(coupleId: string, image: Blob): Promise<string> {
  const path = `${coupleId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from(TALK_BUCKET).upload(path, image, { contentType: "image/jpeg", upsert: false });
  if (error) throw new AppError("Не удалось загрузить фото. Примените миграцию 019_talk_media_todo_color.sql.");
  return path;
}

/** Временные ссылки на фото (бакет закрытый). */
export async function talkImageUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await db().storage.from(TALK_BUCKET).createSignedUrls(paths, 3600);
  const map: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}

export async function removeTalkImages(paths: string[]) {
  if (paths.length > 0) await db().storage.from(TALK_BUCKET).remove(paths);
}
