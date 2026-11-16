import { db } from "@/lib/supabase";
import { LONG_CACHE, signedUrls } from "@/lib/signed-urls";
import { AppError } from "@/lib/errors";

export const HERO_BUCKET = "couple-photos";
const HINT = "Не удалось сохранить фото. Примените миграцию 016_photo_and_repeat.sql.";

const LIB_HINT = "Не удалось сохранить фото. Примените миграцию 029_hero_photo_library.sql.";

export type HeroPhoto = { id: string; couple_id: string; uploaded_by: string | null; path: string; thumb_path: string | null; created_at: string };

/** Все фото, которые вы с партнёром когда-либо ставили на карточку (новые сверху). */
export async function listHeroPhotos(coupleId: string): Promise<HeroPhoto[]> {
  const { data, error } = await db().from("hero_photos").select("id,couple_id,uploaded_by,path,thumb_path,created_at").eq("couple_id", coupleId).order("created_at", { ascending: false });
  if (error) throw new AppError(LIB_HINT);
  return (data ?? []) as HeroPhoto[];
}

/** Загружает новое фото в библиотеку и сразу ставит его на карточку. Прежние фото остаются в библиотеке. */
export async function addHeroPhoto(coupleId: string, userId: string, image: Blob, thumb: Blob | null) {
  const storage = db().storage.from(HERO_BUCKET);
  const id = crypto.randomUUID();
  const path = `${coupleId}/${id}.jpg`;
  const thumbPath = thumb ? `${coupleId}/${id}_t.jpg` : null;
  const { error: uploadError } = await storage.upload(path, image, { contentType: "image/jpeg", upsert: false, cacheControl: LONG_CACHE });
  if (uploadError) throw new AppError(/size|too large|exceed/i.test(uploadError.message) ? "Фото получилось слишком большим. Выберите другое." : HINT);
  let thumbOk = false;
  if (thumb && thumbPath) thumbOk = !(await storage.upload(thumbPath, thumb, { contentType: "image/jpeg", upsert: false, cacheControl: LONG_CACHE })).error;
  const { error } = await db().from("hero_photos").insert({ couple_id: coupleId, uploaded_by: userId, path, thumb_path: thumbOk ? thumbPath : null });
  if (error) { await storage.remove([path, ...(thumbOk && thumbPath ? [thumbPath] : [])]); throw new AppError(LIB_HINT); }
  await selectHeroPhoto(coupleId, path);
}

/** Ставит выбранное из библиотеки фото на карточку и включает его. */
export async function selectHeroPhoto(coupleId: string, path: string) {
  const { data, error } = await db().from("couples").update({ hero_photo_path: path, hero_photo_enabled: true, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError(LIB_HINT);
}

/** Показывать фото на карточке или узор. Сам файл остаётся в библиотеке. */
export async function setHeroEnabled(coupleId: string, enabled: boolean) {
  const { data, error } = await db().from("couples").update({ hero_photo_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError(LIB_HINT);
}

/** Окончательно удаляет фото из библиотеки (с карточки оно тоже пропадёт, если стояло на ней). */
export async function deleteHeroPhoto(coupleId: string, photo: HeroPhoto, isCurrent: boolean) {
  const { error } = await db().from("hero_photos").delete().eq("id", photo.id);
  if (error) throw new AppError("Не удалось удалить фото. Попробуйте ещё раз.");
  if (isCurrent) await db().from("couples").update({ hero_photo_path: null, updated_at: new Date().toISOString() }).eq("id", coupleId);
  await db().storage.from(HERO_BUCKET).remove([photo.path, ...(photo.thumb_path ? [photo.thumb_path] : [])]);
}

export async function heroPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  return signedUrls(HERO_BUCKET, paths);
}

export async function setHeroBlur(coupleId: string, blur: boolean) {
  const { data, error } = await db().from("couples").update({ hero_photo_blur: blur, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError("Не удалось сохранить настройку размытия.");
}

/** Временная ссылка: бакет закрытый, фото открывается только участникам пары. */
export async function heroPhotoUrl(path: string): Promise<string | null> {
  const map = await signedUrls(HERO_BUCKET, [path]);
  return map[path] ?? null;
}

/** Сила размытия в пикселях: новая настройка, а если её нет, прежний переключатель (7 пикселей или без размытия). */
export const heroBlurPx = (couple: { hero_photo_blur?: boolean; hero_photo_blur_amount?: number | null }): number =>
  typeof couple.hero_photo_blur_amount === "number" ? couple.hero_photo_blur_amount : couple.hero_photo_blur !== false ? 7 : 0;

export async function setHeroBlurAmount(coupleId: string, amount: number) {
  const value = Math.max(0, Math.min(24, Math.round(amount)));
  const { data, error } = await db().from("couples").update({ hero_photo_blur_amount: value, hero_photo_blur: value > 0, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError("Не удалось сохранить размытие. Примените миграцию 024_hero_blur_amount_talk_edit.sql.");
}
