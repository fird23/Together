import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import { compressImage } from "@/lib/image";
import { LONG_CACHE, signedUrls } from "@/lib/signed-urls";
import { MAX_VIDEO_BYTES, VideoError, compressVideo, fmtMB, isVideo, readVideoMeta } from "@/lib/video";
import type { AlbumPhoto } from "@/types";

export const ALBUM_BUCKET = "album-media";
const MIGRATION_HINT = "Примените миграцию 026_photo_album.sql.";
const VIDEO_HINT = "Для видео примените миграцию 034_album_video.sql.";
const BASE_COLUMNS = "id,couple_id,uploaded_by,media_path,thumb_path,caption,taken_on,created_at";

export async function listAlbum(coupleId: string, limit?: number): Promise<AlbumPhoto[]> {
  const run = (columns: string) => {
    let query = db().from("album_photos").select(columns).eq("couple_id", coupleId).order("taken_on", { ascending: false }).order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);
    return query;
  };
  let { data, error } = await run(`${BASE_COLUMNS},kind,duration_sec,size_bytes`);
  if (error) ({ data, error } = await run(BASE_COLUMNS)); // миграция 034 ещё не применена: только фото
  if (error) throw new AppError(`Не удалось загрузить альбом. ${MIGRATION_HINT}`);
  return (data ?? []) as unknown as AlbumPhoto[];
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

const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

export type UploadOptions = {
  /** Пережимать и небольшие видео (меньше места, дольше загрузка). Видео больше 20 МБ сжимаются всегда. */
  compressVideos?: boolean;
  /** Подпись текущего этапа и доля готовности (для сжатия видео). */
  onStage?: (label: string, fraction?: number) => void;
};

/** Фото: WebP (или JPEG) примерно до 0,7 МБ и миниатюра. Видео: до 20 МБ, с обложкой. Запись создаётся после загрузки файлов. */
export async function uploadAlbumItem(coupleId: string, userId: string, file: File, takenOn?: string, options: UploadOptions = {}): Promise<void> {
  const storage = db().storage.from(ALBUM_BUCKET);
  const id = crypto.randomUUID();
  const video = isVideo(file);
  const day = takenOn && /^\d{4}-\d{2}-\d{2}$/.test(takenOn) ? takenOn : file.lastModified ? localDay(file.lastModified) : localDay(Date.now());
  const uploaded: string[] = [];

  const put = async (path: string, blob: Blob, contentType: string) => {
    const { error } = await storage.upload(path, blob, { contentType, upsert: false, cacheControl: LONG_CACHE });
    if (error) throw Object.assign(new Error(error.message), { storage: true });
    uploaded.push(path);
  };

  let mediaPath: string, thumbPath: string, extras: Record<string, unknown>;
  try {
    if (video) {
      options.onStage?.("Читаем видео…");
      let blob: Blob = file;
      let type = file.type || "video/mp4";
      if (file.size > MAX_VIDEO_BYTES || options.compressVideos) {
        options.onStage?.("Сжимаем видео…", 0);
        const packed = await compressVideo(file, (f) => options.onStage?.("Сжимаем видео…", f));
        if (file.size > MAX_VIDEO_BYTES || packed.size < file.size) { blob = packed; type = "video/webm"; }
      }
      if (blob.size > MAX_VIDEO_BYTES) throw new VideoError(`Видео больше ${fmtMB(MAX_VIDEO_BYTES)}. Выберите ролик покороче.`);
      const meta = await readVideoMeta(file).catch(() => ({ duration: 0, poster: null as Blob | null }));
      options.onStage?.("Загружаем…");
      mediaPath = `${coupleId}/${id}.${EXT[type] ?? "mp4"}`;
      await put(mediaPath, blob, type);
      if (meta.poster) { thumbPath = `${coupleId}/${id}_t.jpg`; await put(thumbPath, meta.poster, "image/jpeg"); } else thumbPath = mediaPath; // без обложки
      extras = { kind: "video", duration_sec: Math.round(meta.duration * 10) / 10 || null, size_bytes: blob.size };
    } else {
      options.onStage?.("Сжимаем фото…");
      let full = await compressImage(file, { maxSide: 1920, maxBytes: 700_000, format: "webp" });
      let thumb = await compressImage(file, { maxSide: 480, maxBytes: 70_000, format: "webp" });
      mediaPath = `${coupleId}/${id}.${EXT[full.type] ?? "jpg"}`;
      thumbPath = `${coupleId}/${id}_t.${EXT[thumb.type] ?? "jpg"}`;
      options.onStage?.("Загружаем…");
      try { await put(mediaPath, full, full.type); }
      catch (e) {
        // Бакет ещё со старыми правилами (только JPEG): повторяем в JPEG.
        if (full.type !== "image/webp") throw e;
        full = await compressImage(file, { maxSide: 1920, maxBytes: 900_000 });
        thumb = await compressImage(file, { maxSide: 480, maxBytes: 90_000 });
        mediaPath = `${coupleId}/${id}.jpg`; thumbPath = `${coupleId}/${id}_t.jpg`;
        await put(mediaPath, full, "image/jpeg");
      }
      await put(thumbPath, thumb, thumb.type);
      extras = { size_bytes: full.size + thumb.size };
    }
  } catch (e) {
    if (uploaded.length) await storage.remove(uploaded);
    if (e instanceof Error && (e as { storage?: boolean }).storage) throw new AppError(video ? `Не удалось загрузить видео. ${VIDEO_HINT}` : `Не удалось загрузить фото. ${MIGRATION_HINT}`);
    throw e;
  }

  const row = { couple_id: coupleId, uploaded_by: userId, media_path: mediaPath, thumb_path: thumbPath, taken_on: day };
  let { error } = await db().from("album_photos").insert({ ...row, ...extras });
  if (error && !video) ({ error } = await db().from("album_photos").insert(row)); // миграция 034 ещё не применена: фото без служебных колонок
  if (error) {
    await storage.remove(uploaded);
    throw video ? new AppError(`Не удалось сохранить видео. ${VIDEO_HINT}`) : dbError(error);
  }
}

export async function updateAlbumPhoto(id: string, patch: { caption?: string | null; taken_on?: string }) {
  const { data, error } = await db().from("album_photos").update(patch).eq("id", id).select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw new AppError("Не удалось сохранить изменения.");
}

export async function deleteAlbumPhoto(photo: Pick<AlbumPhoto, "id" | "media_path" | "thumb_path">) {
  const { error } = await db().from("album_photos").delete().eq("id", photo.id);
  if (error) throw dbError(error);
  const paths = photo.thumb_path === photo.media_path ? [photo.media_path] : [photo.media_path, photo.thumb_path];
  await db().storage.from(ALBUM_BUCKET).remove(paths);
}

/** Временные ссылки (бакет закрытый), с кешем на устройстве. */
export async function albumUrls(paths: string[]): Promise<Record<string, string>> {
  return signedUrls(ALBUM_BUCKET, paths);
}
