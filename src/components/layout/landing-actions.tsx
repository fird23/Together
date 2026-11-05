"use client";

import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { homePathFor, useWorkspace } from "@/components/providers/workspace-provider";

/** Кнопки на главной: для вошедших «Открыть», для остальных «Создать аккаунт» и «Войти». */
export function LandingActions() {
  const workspace = useWorkspace();

  if (workspace.status === "loading") return <Skeleton className="h-12 w-56" />;

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
