"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native";
import { Skeleton } from "@/components/ui/skeleton";
import { homePathFor, useWorkspace } from "@/components/providers/workspace-provider";

/** Кнопки на главной: для вошедших «Открыть», для остальных «Создать аккаунт» и «Войти». */
export function LandingActions() {
  const workspace = useWorkspace();
  const router = useRouter();
  const native = isNativeApp();

  // В приложении для Android главная-заставка не нужна: сразу открываем пространство или вход.
  useEffect(() => {
    if (!native || workspace.status === "loading") return;
    router.replace(workspace.status === "ready" ? homePathFor(workspace) : "/login");
  }, [native, workspace, router]);

  if (native || workspace.status === "loading") return <Skeleton className="h-12 w-56" />;

  if (workspace.status === "ready") {
    return (
      <ButtonLink href={homePathFor(workspace)} size="lg">
        {workspace.couple ? "Открыть пространство" : "Продолжить настройку"}
      </ButtonLink>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ButtonLink href="/register" size="lg">
        Создать аккаунт
      </ButtonLink>
      <ButtonLink href="/login" variant="secondary" size="lg">
        Войти
      </ButtonLink>
    </div>
  );
}
