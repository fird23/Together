import { db } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

export const HERO_BUCKET = "couple-photos";
const HINT = "Не удалось сохранить фото. Примените миграцию 016_photo_and_repeat.sql.";

/** Загружает фото пары (видно обоим) и привязывает его к карточке. Старый файл удаляется. */
export async function setHeroPhoto(coupleId: string, image: Blob, previousPath: string | null) {
  const storage = db().storage.from(HERO_BUCKET);
  const path = `${coupleId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await storage.upload(path, image, { contentType: "image/jpeg", upsert: false });
  if (uploadError) throw new AppError(/size|too large|exceed/i.test(uploadError.message) ? "Фото получилось слишком большим. Выберите другое." : HINT);
  const { data, error } = await db().from("couples").update({ hero_photo_path: path, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) { await storage.remove([path]); throw new AppError(HINT); }
  if (previousPath) await storage.remove([previousPath]);
}

export async function removeHeroPhoto(coupleId: string, path: string | null) {
  const { data, error } = await db().from("couples").update({ hero_photo_path: null, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError("Не удалось удалить фото. Попробуйте ещё раз.");
  if (path) await db().storage.from(HERO_BUCKET).remove([path]);
}

export async function setHeroBlur(coupleId: string, blur: boolean) {
  const { data, error } = await db().from("couples").update({ hero_photo_blur: blur, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError("Не удалось сохранить настройку размытия.");
}

/** Временная ссылка: бакет закрытый, фото открывается только участникам пары. */
export async function heroPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await db().storage.from(HERO_BUCKET).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

/** Сила размытия в пикселях: новая настройка, а если её нет, прежний переключатель (7 пикселей или без размытия). */
export const heroBlurPx = (couple: { hero_photo_blur?: boolean; hero_photo_blur_amount?: number | null }): number =>
  typeof couple.hero_photo_blur_amount === "number" ? couple.hero_photo_blur_amount : couple.hero_photo_blur !== false ? 7 : 0;

export async function setHeroBlurAmount(coupleId: string, amount: number) {
  const value = Math.max(0, Math.min(24, Math.round(amount)));
  const { data, error } = await db().from("couples").update({ hero_photo_blur_amount: value, hero_photo_blur: value > 0, updated_at: new Date().toISOString() }).eq("id", coupleId).select("id");
  if (error || !data?.length) throw new AppError("Не удалось сохранить размытие. Примените миграцию 024_hero_blur_amount_talk_edit.sql.");
}
