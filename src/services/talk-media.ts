import { db } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import { LONG_CACHE, signedUrls } from "@/lib/signed-urls";

export const TALK_BUCKET = "talk-media";

/** Загружает сжатое фото в закрытое хранилище пары и возвращает путь. */
export async function uploadTalkImage(coupleId: string, image: Blob): Promise<string> {
  const path = `${coupleId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from(TALK_BUCKET).upload(path, image, { contentType: "image/jpeg", upsert: false, cacheControl: LONG_CACHE });
  if (error) throw new AppError("Не удалось загрузить фото. Примените миграцию 019_talk_media_todo_color.sql.");
  return path;
}

/** Временные ссылки на фото (бакет закрытый). */
export async function talkImageUrls(paths: string[]): Promise<Record<string, string>> {
  return signedUrls(TALK_BUCKET, paths);
}

export async function removeTalkImages(paths: string[]) {
  if (paths.length > 0) await db().storage.from(TALK_BUCKET).remove(paths);
}
