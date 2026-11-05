"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCw } from "lucide-react";
import { useWorkspace, homePathFor } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { extractInviteToken, safeInternalPath } from "@/lib/invite";

export function FullScreenLoader({ label = "Загружаем ваше пространство" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-milk px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <Logo asText />
        <div className="h-1 w-28 overflow-hidden rounded-full bg-sand-200">
          <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,var(--c-sand-200),var(--c-accent-300),var(--c-sand-200))] bg-[length:200%_100%]" />
        </div>
        <p className="text-sm text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

function LoadError() {
  const { refresh, signOut } = useWorkspace();
  return (
    <div className="grid min-h-dvh place-items-center bg-milk px-6">
      <div className="max-w-sm text-center">
        <Logo asText />
        <h1 className="mt-8 font-serif text-2xl font-semibold">Не удалось загрузить данные</h1>
        <p className="mt-2 text-ink-soft">Проверьте соединение и попробуйте ещё раз. Если ошибка повторяется, выйдите и войдите снова.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => void refresh()}>
            <RotateCw className="size-4" aria-hidden /> Повторить
          </Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Пускает только вошедших. Остальных отправляет на /login и запоминает, куда они шли. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, wasExplicitSignOut } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out" && !wasExplicitSignOut()) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router, wasExplicitSignOut]);

  if (status === "error") return <LoadError />;
  if (status !== "ready") return <FullScreenLoader />;
  return <>{children}</>;
}

/**
 * Для страниц входа и регистрации: уже вошедшего человека уводит дальше.
 * Приоритет: приглашение → запомненная страница → пространство/подключение к паре.
 */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const workspace = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const invite = extractInviteToken(params.get("invite"));
  const next = safeInternalPath(params.get("next"));
  const target = invite ? `/invite/${invite}` : (next ?? homePathFor(workspace));

  useEffect(() => {
    if (workspace.status === "ready") router.replace(target);
  }, [workspace.status, target, router]);

  if (workspace.status === "error") return <LoadError />;
  if (workspace.status === "loading" || workspace.status === "ready") return <FullScreenLoader />;
  return <>{children}</>;
}
