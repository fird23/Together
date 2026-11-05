import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Регистрация" };

export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string; next?: string }> }) {
  const { invite, next } = await searchParams;
  return <RegisterForm invite={invite} next={next} />;
}
