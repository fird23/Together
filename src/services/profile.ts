import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import { AVATAR_BUCKET } from "@/lib/avatar";

export async function updateDisplayName(userId: string, name: string) {
  const { data, error } = await db()
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");
  if (error) throw dbError(error);
  if (!data?.length) throw dbError({ message: "Не удалось сохранить имя." });
}

/**
 * Загружает новое фото и привязывает его к профилю. Имя файла каждый раз новое,
 * поэтому партнёр сразу видит обновление, а браузер может кешировать надолго.
 * Если профиль обновить не удалось, загруженный файл убирается.
 */
export async function setAvatar(userId: string, image: Blob, previousPath: string | null) {
  const storage = db().storage.from(AVATAR_BUCKET);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await storage.upload(path, image, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    const tooBig = /size|too large|exceed/i.test(uploadError.message);
    throw new AppError(tooBig ? "Фото получилось слишком большим. Выберите другое." : "Не удалось загрузить фото. Попробуйте ещё раз.");
  }

  const { data, error } = await db()
    .from("profiles")
    .update({ avatar_url: path, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) {
    await storage.remove([path]);
    throw new AppError("Не удалось сохранить фото. Попробуйте ещё раз.");
  }

  if (previousPath) await storage.remove([previousPath]); // старый файл не нужен; ошибка тут не критична
}

export async function removeAvatar(userId: string, currentPath: string | null) {
  const { data, error } = await db()
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) throw new AppError("Не удалось удалить фото. Попробуйте ещё раз.");
  if (currentPath) await db().storage.from(AVATAR_BUCKET).remove([currentPath]);
}
