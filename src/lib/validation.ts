import { z } from "zod";
import { todayISO } from "@/utils/days";
import { extractInviteToken } from "@/lib/invite";

/**
 * Схемы проверки данных. Используются и в формах (мгновенные подсказки),
 * и на сервере (настоящая защита) — правила в одном месте.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Введите email в формате name@example.com"));

export const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .max(72, "Пароль должен быть не длиннее 72 символов")
  .regex(/[A-Za-zА-Яа-яЁё]/, "Добавьте в пароль хотя бы одну букву")
  .regex(/\d/, "Добавьте в пароль хотя бы одну цифру");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Имя должно быть не короче 2 символов")
  .max(40, "Имя должно быть не длиннее 40 символов");

/** Дата начала отношений: YYYY-MM-DD, существующая, не из будущего. */
export const startDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату начала отношений")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Такой даты не существует")
  .refine((v) => v >= "1950-01-01", "Укажите дату не раньше 1950 года")
  .refine((v) => v <= todayISO(), "Дата не может быть в будущем");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const profileNameSchema = z.object({ name: nameSchema });

export const joinInviteSchema = z.object({
  invite: z
    .string()
    .trim()
    .min(1, "Вставьте ссылку или код приглашения")
    .refine((v) => extractInviteToken(v) !== null, "Приглашение не найдено в этом тексте. Скопируйте ссылку целиком."),
});

export const createCoupleSchema = z.object({ startDate: startDateSchema });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Повторите новый пароль"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Повторите новый пароль"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

/** Превращает ошибки Zod в { имяПоля: "первое сообщение" }. */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
