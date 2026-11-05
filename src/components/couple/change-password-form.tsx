"use client";

import { useRef, useState } from "react";
import { PasswordField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { changePasswordSchema } from "@/lib/validation";
import { changePassword } from "@/services/auth";

export function ChangePasswordForm({ email }: { email: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(changePasswordSchema, async (data) => {
    setSaved(false);
    await changePassword(email, data.currentPassword, data.newPassword);
    formRef.current?.reset();
    setSaved(true);
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      <PasswordField name="currentPassword" label="Текущий пароль" autoComplete="current-password" error={errors.currentPassword} disabled={pending} />
      <PasswordField
        name="newPassword"
        label="Новый пароль"
        autoComplete="new-password"
        hint="Не меньше 8 символов, буквы и хотя бы одна цифра."
        error={errors.newPassword}
        disabled={pending}
      />
      <PasswordField name="confirmPassword" label="Повторите новый пароль" autoComplete="new-password" error={errors.confirmPassword} disabled={pending} />
      {formError && <Alert tone="error">{formError}</Alert>}
      {saved && !formError && <Alert tone="success">Пароль изменён.</Alert>}
      <Button type="submit" variant="secondary" loading={pending}>
        Изменить пароль
      </Button>
    </form>
  );
}
