/**
 * Аватары. В базе (profiles.avatar_url) хранится только ПУТЬ вида "<id>/<имя>.jpg",
 * а адрес картинки собирается здесь. Так в профиль нельзя подсунуть чужую ссылку.
 */

export const AVATAR_BUCKET = "avatars";
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // выбранный файл; после сжатия он станет в разы меньше
const OUTPUT_SIDE = 512;

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");

/** Публичный адрес картинки по пути из профиля. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path || !BASE) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${BASE}/storage/v1/object/public/${AVATAR_BUCKET}/${encoded}`;
}

export class AvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarError";
  }
}

/**
 * Готовит фото: учитывает поворот с телефона, обрезает по центру до квадрата,
 * уменьшает до 512×512 и сохраняет как JPEG. Итог обычно 30–100 КБ.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AvatarError("Выберите фото в формате JPG, PNG или WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new AvatarError("Файл слишком большой. Выберите фото до 15 МБ.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new AvatarError("Не удалось открыть изображение. Попробуйте другое фото.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(OUTPUT_SIDE, side); // маленькие фото не растягиваем
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new AvatarError("Не удалось обработать изображение.");
  }
  context.fillStyle = "#ffffff"; // у PNG с прозрачностью фон станет белым, а не чёрным
  context.fillRect(0, 0, size, size);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new AvatarError("Не удалось обработать изображение.");
  return blob;
}
