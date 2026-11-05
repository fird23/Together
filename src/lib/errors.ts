export const GENERIC_ERROR = "Что-то пошло не так. Попробуйте ещё раз.";

export type AppErrorCode = "email_not_confirmed" | "unknown";

/** Ошибка с понятным пользователю текстом. */
export class AppError extends Error {
  code: AppErrorCode;
  constructor(message: string, code: AppErrorCode = "unknown") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

type LikeError = { message?: string; code?: string; status?: number } | null | undefined;

/** Переводит ошибки Supabase Auth на русский. */
export function authError(error: LikeError): AppError {
  const message = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return new AppError("Email ещё не подтверждён. Откройте письмо от нас и перейдите по ссылке.", "email_not_confirmed");
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return new AppError("Неверный email или пароль.");
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return new AppError("Аккаунт с таким email уже есть. Попробуйте войти.");
  }
  if (code === "same_password" || message.includes("different from the old password")) {
    return new AppError("Новый пароль должен отличаться от текущего.");
  }
  if (code === "weak_password" || message.includes("password should be")) {
    return new AppError("Пароль слишком простой. Используйте не меньше 8 символов, буквы и цифры.");
  }
  if (code.includes("rate_limit") || message.includes("rate limit") || error?.status === 429) {
    return new AppError("Слишком много попыток. Подождите минуту и повторите.");
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return new AppError("Нет соединения с сервером. Проверьте интернет и повторите.");
  }
  return new AppError(GENERIC_ERROR);
}

/**
 * Ошибки наших SQL-функций уже написаны по-русски — их показываем как есть.
 * Всё остальное (технические сообщения базы) скрываем за общей фразой.
 */
export function dbError(error: LikeError): AppError {
  const message = error?.message ?? "";
  if (/[А-Яа-яЁё]/.test(message)) return new AppError(message);
  if (message.toLowerCase().includes("failed to fetch")) {
    return new AppError("Нет соединения с сервером. Проверьте интернет и повторите.");
  }
  return new AppError(GENERIC_ERROR);
}
