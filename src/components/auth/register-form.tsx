"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MailCheck, UserRound } from "lucide-react";
import { TextField, PasswordField } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AuthHeading } from "@/components/layout/auth-shell";
import { ResendButton } from "@/components/auth/resend-button";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { registerSchema } from "@/lib/validation";
import { signUp } from "@/services/auth";
import { authHref, extractInviteToken } from "@/lib/invite";

export function RegisterForm({ invite, next }: { invite?: string; next?: string }) {
  const token = extractInviteToken(invite);
  const redirectPath = token ? `/invite/${token}` : "/login";
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(registerSchema, async (data) => {
    const { signedIn } = await signUp({ ...data, redirectTo: `${window.location.origin}${redirectPath}` });
    // Если подтверждение email выключено, сессия уже есть, и GuestGate сам переведёт на подключение к паре.
    if (!signedIn) setSentTo(data.email);
  });

  if (sentTo) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <AuthHeading
          title="Проверьте почту"
          description={`Мы отправили письмо на ${sentTo}. Перейдите по ссылке из письма, чтобы подтвердить адрес. После этого вы сразу попадёте в приложение.`}
        />
        <ResendButton email={sentTo} redirectPath={redirectPath} />
        <ButtonLink href={authHref("/login", invite, next)} variant="ghost" fullWidth className="mt-3">
          Вернуться ко входу
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Создайте аккаунт" description="Это займёт минуту. Пару вы соберёте на следующем шаге." />
      {token && (
        <Alert tone="info" className="mb-5" title="Вас пригласили в пару">
          Создайте аккаунт, и мы покажем приглашение.
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          name="name"
          label="Как вас называть"
          icon={UserRound}
          autoComplete="given-name"
          placeholder="Например, Анна"
          hint="Это имя увидит ваш партнёр."
          error={errors.name}
          disabled={pending}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email}
          disabled={pending}
        />
        <PasswordField
          name="password"
          label="Пароль"
          autoComplete="new-password"
          placeholder="Не меньше 8 символов"
          hint="Буквы и хотя бы одна цифра."
          error={errors.password}
          disabled={pending}
        />
        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Создать аккаунт
        </Button>
      </form>
      <p className="mt-8 text-center text-ink-soft">
        Уже есть аккаунт?{" "}
        <Link href={authHref("/login", invite, next)} className="font-medium text-accent-700 hover:underline">
          Войти
        </Link>
      </p>
    </>
  );
}
