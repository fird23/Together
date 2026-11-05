"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { TextField, PasswordField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AuthHeading } from "@/components/layout/auth-shell";
import { ResendButton } from "@/components/auth/resend-button";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { loginSchema } from "@/lib/validation";
import { signIn } from "@/services/auth";
import { AppError } from "@/lib/errors";
import { authHref, extractInviteToken } from "@/lib/invite";

export function LoginForm({ invite, next }: { invite?: string; next?: string }) {
  const token = extractInviteToken(invite);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(loginSchema, async (data) => {
    setUnconfirmedEmail(null);
    try {
      await signIn(data.email, data.password);
      // Дальше человека уводит GuestGate: на приглашение, на запомненную страницу или на подключение к паре.
    } catch (e) {
      if (e instanceof AppError && e.code === "email_not_confirmed") setUnconfirmedEmail(data.email);
      throw e;
    }
  });

  return (
    <>
      <AuthHeading title="С возвращением" description="Войдите, чтобы открыть ваше общее пространство." />
      {token && (
        <Alert tone="info" className="mb-5" title="Вас пригласили в пару">
          Войдите или создайте аккаунт, и мы покажем приглашение.
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
          autoComplete="current-password"
          placeholder="Ваш пароль"
          error={errors.password}
          disabled={pending}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-accent-700 hover:underline">
            Забыли пароль?
          </Link>
        </div>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Войти
        </Button>
      </form>
      {unconfirmedEmail && (
        <div className="mt-4">
          <ResendButton email={unconfirmedEmail} redirectPath={token ? `/invite/${token}` : "/login"} />
        </div>
      )}
      <p className="mt-8 text-center text-ink-soft">
        Ещё нет аккаунта?{" "}
        <Link href={authHref("/register", invite, next)} className="font-medium text-accent-700 hover:underline">
          Создать аккаунт
        </Link>
      </p>
    </>
  );
}
