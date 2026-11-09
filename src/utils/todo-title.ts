/** Название дела хранится либо простой строкой, либо JSON {t, c, s} (с комментарием и подпунктами). Здесь нужен только заголовок. */
export function cleanTodoTitle(raw: string): string {
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try { const parsed = JSON.parse(raw) as { t?: unknown }; if (typeof parsed.t === "string" && parsed.t) return parsed.t; } catch { /* обычная строка */ }
  }
  return raw;
}
