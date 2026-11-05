import { db } from "@/lib/supabase";
import { AppError, authError } from "@/lib/errors";

export async function signIn(email: string, password: string) {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw authError(error);
}

/** Возвращает true, если сессия создана сразу (подтверждение email отключено). */
export async function signUp(input: { name: string; email: string; password: string; redirectTo: string }) {
  const { data, error } = await db().auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.name }, emailRedirectTo: input.redirectTo },
  });
  if (error) throw authError(error);
  // Supabase отвечает «успехом» без identities, если такой email уже зарегистрирован.
  if (data.user && data.user.identities?.length === 0) {
    throw new AppError("Аккаунт с таким email уже есть. Попробуйте войти.");
  }
  return { signedIn: Boolean(data.session) };
}

export async function resendConfirmation(email: string, redirectTo: string) {
  const { error } = await db().auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
  if (error) throw authError(error);
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw authError(error);
}

export async function setNewPassword(password: string) {
  const { error } = await db().auth.updateUser({ password });
  if (error) throw authError(error);
}

/** Смена пароля из настроек: сначала проверяем текущий пароль. */
export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { error: verifyError } = await db().auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) {
    const translated = authError(verifyError);
    throw new AppError(translated.message === "Неверный email или пароль." ? "Текущий пароль указан неверно." : translated.message);
  }
  await setNewPassword(newPassword);
}

export async function signOut() {
  await db().auth.signOut();
}
