"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LinkIcon } from "lucide-react";
import { PasswordField } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { AuthHeading } from "@/components/layout/auth-shell";
import { FullScreenLoader } from "@/components/providers/gates";
import { useWorkspace, homePathFor } from "@/components/providers/workspace-provider";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { resetPasswordSchema } from "@/lib/validation";
import { setNewPassword } from "@/services/auth";

export function ResetPasswordForm() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [done, setDone] = useState(false);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(resetPasswordSchema, async (data) => {
    await setNewPassword(data.newPassword);
    setDone(true);
  });

  if (workspace.status === "loading") return <FullScreenLoader label="Проверяем ссылку" />;

  if (done) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <AuthHeading title="Пароль изменён" description="Теперь вы можете пользоваться новым паролем. Вы уже вошли в аккаунт." />
        <Button size="lg" fullWidth onClick={() => router.replace(homePathFor(workspace))}>
          Продолжить
        </Button>
      </div>
    );
  }

  // Форма нужна только тем, кто пришёл по ссылке из письма.
  if (!workspace.recovery) {
    return (
      <EmptyState
        icon={LinkIcon}
        tone="error"
        title="Ссылка не сработала"
        description="Она могла устареть или уже быть использованной. Запросите новую ссылку, это займёт минуту."
        action={<ButtonLink href="/forgot-password">Запросить новую ссылку</ButtonLink>}
      />
    );
  }

  return (
    <>
      <AuthHeading title="Новый пароль" description="Придумайте пароль, которым будете входить в Together." />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordField
          name="newPassword"
          label="Новый пароль"
          autoComplete="new-password"
          placeholder="Не меньше 8 символов"
          hint="Буквы и хотя бы одна цифра."
          error={errors.newPassword}
          disabled={pending}
        />
        <PasswordField
          name="confirmPassword"
          label="Повторите пароль"
          autoComplete="new-password"
          error={errors.confirmPassword}
          disabled={pending}
        />
        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Сохранить пароль
        </Button>
      </form>
    </>
  );
}
