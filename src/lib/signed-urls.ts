import { db } from "@/lib/supabase";

/**
 * Временные ссылки на файлы закрытых бакетов с кешем на этом устройстве.
 * Раньше при каждой загрузке выдавалась новая ссылка, поэтому браузер заново скачивал одни и те же фото.
 * Теперь ссылка живёт сутки (достаточно, чтобы не качать фото заново при каждом открытии, и не так долго, чтобы старая ссылка была опасной) и переиспользуется, а файлы загружаются с долгим cache-control: повторные открытия идут из кеша браузера
 * и почти не расходуют трафик хранилища.
 */
const TTL_SECONDS = 24 * 3600;
const REFRESH_BEFORE_MS = 3 * 3600 * 1000;
const PREFIX = "together:urls:";
const MAX_ENTRIES = 800;

type Cache = Record<string, { url: string; exp: number }>;

const read = (bucket: string): Cache => {
  try { return JSON.parse(window.localStorage.getItem(PREFIX + bucket) ?? "{}") as Cache; } catch { return {}; }
};
const write = (bucket: string, cache: Cache) => {
  const now = Date.now();
  let entries = Object.entries(cache).filter(([, v]) => v.exp > now);
  if (entries.length > MAX_ENTRIES) entries = entries.sort((a, b) => b[1].exp - a[1].exp).slice(0, MAX_ENTRIES);
  try { window.localStorage.setItem(PREFIX + bucket, JSON.stringify(Object.fromEntries(entries))); } catch { /* нет места: работаем без кеша */ }
};

export async function signedUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (paths.length === 0) return result;
  const cache = typeof window !== "undefined" ? read(bucket) : {};
  const now = Date.now();
  const missing: string[] = [];
  for (const path of new Set(paths)) {
    const hit = cache[path];
    if (hit && hit.exp - now > REFRESH_BEFORE_MS) result[path] = hit.url; else missing.push(path);
  }
  if (missing.length > 0) {
    const { data } = await db().storage.from(bucket).createSignedUrls(missing, TTL_SECONDS);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        result[item.path] = item.signedUrl;
        cache[item.path] = { url: item.signedUrl, exp: now + TTL_SECONDS * 1000 };
      }
    }
    if (typeof window !== "undefined") write(bucket, cache);
  }
  return result;
}

/** При выходе из аккаунта ссылки с устройства удаляются. */
export function clearUrlCache() {
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith(PREFIX)) window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}

/** Файлы не меняются (имя содержит случайный id), поэтому браузеру можно хранить их год. */
export const LONG_CACHE = "31536000";
