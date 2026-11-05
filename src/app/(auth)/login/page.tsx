import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string; next?: string }> }) {
  const { invite, next } = await searchParams;
  return <LoginForm invite={invite} next={next} />;
}
