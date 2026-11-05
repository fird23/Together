/** Помощники для пригласительных ссылок. Сам токен в базу не попадает — только его SHA-256. */

const TOKEN_PATTERN = /[a-f0-9]{64}/i;

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** 32 случайных байта из криптографического генератора браузера. */
export function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Достаёт токен из ссылки целиком или из «голого» кода. Возвращает null, если его нет. */
export function extractInviteToken(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = input.match(TOKEN_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

/** Разрешает только внутренние пути вида /dashboard, чтобы нельзя было увести пользователя на чужой сайт. */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

/** Собирает ссылку на страницу входа/регистрации, сохраняя приглашение и «куда вернуться». */
export function authHref(path: string, invite?: string | null, next?: string | null): string {
  const params = new URLSearchParams();
  const token = extractInviteToken(invite);
  const safeNext = safeInternalPath(next);
  if (token) params.set("invite", token);
  if (safeNext) params.set("next", safeNext);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
