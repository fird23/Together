/** Название дела хранится либо простой строкой, либо JSON {t, c, s} (с комментарием и подпунктами). Здесь нужен только заголовок. */
export function cleanTodoTitle(raw: string): string {
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try { const parsed = JSON.parse(raw) as { t?: unknown }; if (typeof parsed.t === "string" && parsed.t) return parsed.t; } catch { /* обычная строка */ }
  }
  return raw;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface ParsedTodoData {
  cleanTitle: string;
  comment: string;
  subtasks: Subtask[];
}

export function parseTodoTitle(rawTitle: string): ParsedTodoData {
  try {
    if (rawTitle.startsWith("{") && rawTitle.endsWith("}")) {
      const parsed = JSON.parse(rawTitle);
      return {
        cleanTitle: parsed.t || "",
        comment: parsed.c || "",
        subtasks: Array.isArray(parsed.s) ? parsed.s : [],
      };
    }
  } catch { /* обычная строка */ }
  return { cleanTitle: rawTitle, comment: "", subtasks: [] };
}

export function encodeTodoTitle(cleanTitle: string, comment: string, subtasks: Subtask[]): string {
  if (!comment.trim() && subtasks.length === 0) {
    return cleanTitle.trim();
  }
  return JSON.stringify({
    t: cleanTitle.trim(),
    c: comment.trim(),
    s: subtasks,
  });
}
