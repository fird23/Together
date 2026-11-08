/** Сжатие фото на телефоне перед загрузкой: поворот по EXIF, уменьшение сторон и JPEG, пока файл не станет достаточно маленьким. */
export class ImageError extends Error {
  constructor(message: string) { super(message); this.name = "ImageError"; }
}

export async function compressImage(file: File, { maxSide, maxBytes }: { maxSide: number; maxBytes: number }): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new ImageError("Выберите картинку: фото или скриншот.");
  if (file.size > 25 * 1024 * 1024) throw new ImageError("Файл слишком большой. Выберите фото до 25 МБ.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new ImageError("Не удалось открыть это фото. Попробуйте другое."); }

  try {
    for (const factor of [1, 0.8, 0.62, 0.48]) {
      const scale = Math.min(1, (maxSide * factor) / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new ImageError("Не удалось обработать фото.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.66, 0.54]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= maxBytes) return blob;
      }
    }
  } finally { bitmap.close(); }
  throw new ImageError("Не получилось сделать фото достаточно маленьким. Выберите другое.");
}
