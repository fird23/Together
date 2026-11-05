import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Новый пароль" };

export default function Page() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
