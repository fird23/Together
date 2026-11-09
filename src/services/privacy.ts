import { db } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/** Видит ли партнёр мои отметки в вишлистах. По умолчанию — нет. */
export async function getShareWishlistMarks(userId: string): Promise<boolean> {
  const { data, error } = await db().from("wishlist_mark_sharing").select("share").eq("user_id", userId).maybeSingle();
  if (error) throw new AppError("Не удалось загрузить настройку. Примените миграцию 021_wishlist_marks_sharing.sql.");
  return data?.share === true;
}

export async function setShareWishlistMarks(userId: string, share: boolean) {
  const { error } = await db().from("wishlist_mark_sharing").upsert({ user_id: userId, share, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new AppError("Не удалось сохранить настройку. Попробуйте ещё раз.");
}
