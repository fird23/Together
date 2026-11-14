/**
 * Дата съёмки из метаданных фото (EXIF) в формате YYYY-MM-DD. Работает для JPEG; для остальных файлов
 * и снимков без метаданных возвращает null. Читает только начало файла.
 */
export async function readPhotoDate(file: File): Promise<string | null> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return null;
    let pos = 2;
    while (pos + 4 < v.byteLength) {
      if (v.getUint8(pos) !== 0xff) return null;
      const marker = v.getUint8(pos + 1);
      const size = v.getUint16(pos + 2);
      if (marker === 0xe1 && v.getUint32(pos + 4) === 0x45786966 /* Exif */) return fromTiff(v, pos + 10, pos + 2 + size);
      if (marker === 0xda) return null; // дальше уже сами пиксели
      pos += 2 + size;
    }
  } catch { /* битые метаданные не мешают загрузке */ }
  return null;
}

function fromTiff(v: DataView, base: number, end: number): string | null {
  const little = v.getUint16(base) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, little);
  const u32 = (o: number) => v.getUint32(o, little);
  const text = (offset: number, length: number) => {
    let s = "";
    for (let i = 0; i < length && offset + i < end; i++) { const c = v.getUint8(offset + i); if (c === 0) break; s += String.fromCharCode(c); }
    return s;
  };
  const readIfd = (ifd: number, want: number[]) => {
    const found: Record<number, string> = {};
    let exifPtr = 0;
    if (ifd + 2 > end) return { found, exifPtr };
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > end) break;
      const tag = u16(e);
      if (tag === 0x8769) exifPtr = base + u32(e + 8);
      if (want.includes(tag) && u16(e + 2) === 2) {
        const len = u32(e + 4);
        found[tag] = text(len > 4 ? base + u32(e + 8) : e + 8, len);
      }
    }
    return { found, exifPtr };
  };
  const first = readIfd(base + u32(base + 4), [0x0132]);
  const exif = first.exifPtr ? readIfd(first.exifPtr, [0x9003, 0x9004]).found : {};
  const raw = exif[0x9003] ?? exif[0x9004] ?? first.found[0x0132];
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1990 || year > new Date().getFullYear() + 1 || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 1 || Number(m[3]) > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}
