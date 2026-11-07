/** Подготовка общего фото для карточки «Мы вместе уже»: поворот с телефона, сжатие до 1400 px, JPEG. */
export class HeroPhotoError extends Error {
  constructor(message: string) { super(message); this.name = "HeroPhotoError"; }
}

export const HERO_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 1400;

export async function prepareHeroPhoto(file: File): Promise<Blob> {
  if (!ALLOWED.includes(file.type)) throw new HeroPhotoError("Выберите фото в формате JPG, PNG или WebP.");
  if (file.size > MAX_INPUT_BYTES) throw new HeroPhotoError("Файл слишком большой. Выберите фото до 20 МБ.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new HeroPhotoError("Не удалось открыть это фото. Попробуйте другое."); }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new HeroPhotoError("Не удалось обработать фото.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new HeroPhotoError("Не удалось обработать фото.");
  return blob;
}
