import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import { compressImage } from "@/lib/image";
import type { AlbumPhoto } from "@/types";

export const ALBUM_BUCKET = "album-media";
const MIGRATION_HINT = "Примените миграцию 026_photo_album.sql.";
const COLUMNS = "id,couple_id,uploaded_by,media_path,thumb_path,caption,taken_on,created_at";

export async function listAlbum(coupleId: string, limit?: number): Promise<AlbumPhoto[]> {
  let query = db()
    .from("album_photos")
    .select(COLUMNS)
    .eq("couple_id", coupleId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new AppError(`Не удалось загрузить альбом. ${MIGRATION_HINT}`);
  return (data ?? []) as AlbumPhoto[];
}

export async function albumCount(coupleId: string): Promise<number> {
  const { count, error } = await db().from("album_photos").select("id", { count: "exact", head: true }).eq("couple_id", coupleId);
  if (error) return 0;
  return count ?? 0;
}

const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Сжимает фото, загружает оригинал и миниатюру и создаёт запись. Дата берётся из файла (обычно это дата съёмки). */
export async function uploadAlbumPhoto(coupleId: string, userId: string, file: File): Promise<void> {
  const full = await compressImage(file, { maxSide: 2200, maxBytes: 1_800_000 });
  const thumb = await compressImage(file, { maxSide: 520, maxBytes: 140_000 });
  const id = crypto.randomUUID();
  const mediaPath = `${coupleId}/${id}.jpg`;
  const thumbPath = `${coupleId}/${id}_t.jpg`;
  const storage = db().storage.from(ALBUM_BUCKET);

  const a = await storage.upload(mediaPath, full, { contentType: "image/jpeg", upsert: false });
  if (a.error) throw new AppError(`Не удалось загрузить фото. ${MIGRATION_HINT}`);
  const b = await storage.upload(thumbPath, thumb, { contentType: "image/jpeg", upsert: false });
  if (b.error) { await storage.remove([mediaPath]); throw new AppError("Не удалось загрузить фото. Попробуйте ещё раз."); }

  const { error } = await db().from("album_photos").insert({
    couple_id: coupleId,
    uploaded_by: userId,
    media_path: mediaPath,
    thumb_path: thumbPath,
    taken_on: file.lastModified ? localDay(file.lastModified) : localDay(Date.now()),
  });
  if (error) { await storage.remove([mediaPath, thumbPath]); throw dbError(error); }
}

export async function updateAlbumPhoto(id: string, patch: { caption?: string | null; taken_on?: string }) {
  const { data, error } = await db().from("album_photos").update(patch).eq("id", id).select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw new AppError("Не удалось сохранить изменения.");
}

export async function deleteAlbumPhoto(photo: Pick<AlbumPhoto, "id" | "media_path" | "thumb_path">) {
  const { error } = await db().from("album_photos").delete().eq("id", photo.id);
  if (error) throw dbError(error);
  await db().storage.from(ALBUM_BUCKET).remove([photo.media_path, photo.thumb_path]);
}

/** Временные ссылки (бакет закрытый). */
export async function albumUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await db().storage.from(ALBUM_BUCKET).createSignedUrls(paths, 3600);
  const map: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}
