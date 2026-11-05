"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AuthHeading } from "@/components/layout/auth-shell";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/services/auth";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(forgotPasswordSchema, async (data) => {
    await requestPasswordReset(data.email, `${window.location.origin}/reset-password`);
    setSentTo(data.email);
  });

  if (sentTo) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <AuthHeading
          title="Письмо отправлено"
          description={`Если аккаунт с адресом ${sentTo} существует, мы отправили на него ссылку для нового пароля. Она действует ограниченное время.`}
        />
        <Button variant="secondary" fullWidth onClick={() => setSentTo(null)}>
          Указать другой адрес
        </Button>
        <p className="mt-6 text-center">
          <Link href="/login" className="font-medium text-accent-700 hover:underline">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Восстановление пароля" description="Укажите email, и мы пришлём ссылку для создания нового пароля." />
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
        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Отправить ссылку
        </Button>
      </form>
      <p className="mt-8 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-accent-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Вернуться ко входу
        </Link>
      </p>
    </>
  );
}
