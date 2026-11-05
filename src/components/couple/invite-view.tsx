"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Link2, LinkIcon, Users, XCircle, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace, homePathFor } from "@/components/providers/workspace-provider";
import { acceptInvitation, previewInvitation } from "@/services/couple";
import { authHref, extractInviteToken } from "@/lib/invite";
import { GENERIC_ERROR } from "@/lib/errors";
import { formatDateRu } from "@/utils/days";
import type { InvitePreview, InviteState } from "@/types";

const dead: Record<Exclude<InviteState, "valid" | "own" | "in_couple">, { icon: LucideIcon; title: string; text: string }> = {
  expired: {
    icon: Clock,
    title: "Срок приглашения истёк",
    text: "Ссылка действует 7 дней. Попросите партнёра выпустить новую в своём пространстве Together.",
  },
  used: {
    icon: CheckCircle2,
    title: "Приглашение уже использовано",
    text: "По этой ссылке уже присоединились. Если это были не вы, попросите партнёра выпустить новую ссылку.",
  },
  revoked: {
    icon: XCircle,
    title: "Приглашение отменено",
    text: "Партнёр отменил эту ссылку или выпустил вместо неё новую. Попросите прислать актуальную.",
  },
  not_found: {
    icon: LinkIcon,
    title: "Приглашение не найдено",
    text: "Проверьте, что ссылка скопирована целиком, или попросите партнёра отправить её ещё раз.",
  },
};

export function InviteView({ token }: { token: string }) {
  const workspace = useWorkspace();
  const router = useRouter();
  const tokenOk = extractInviteToken(token) === token.toLowerCase() && token.length === 64;
  const userId = workspace.session?.user.id ?? null;
  const settled = workspace.status === "ready" || workspace.status === "signed-out";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ждём, пока станет ясно, вошёл ли человек: ответ зависит от того, чей это аккаунт.
  useEffect(() => {
    if (!settled || !tokenOk) return;
    let cancelled = false;
    previewInvitation(token.toLowerCase())
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, tokenOk, settled, userId, attempt]);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      await acceptInvitation(token.toLowerCase());
      await workspace.refresh();
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
      setPending(false);
    }
  }

  const homeHref = workspace.status === "ready" ? homePathFor(workspace) : "/";
  const homeLabel = workspace.status === "ready" ? "Перейти в приложение" : "На главную";

  if (!tokenOk) return <DeadEnd state="not_found" href={homeHref} label={homeLabel} />;

  if (failed) {
    return (
      <EmptyState
        icon={LinkIcon}
        tone="error"
        title="Не удалось проверить приглашение"
        description="Похоже, проблема с соединением. Попробуйте ещё раз."
        action={<Button onClick={() => setAttempt((n) => n + 1)}>Повторить</Button>}
      />
    );
  }

  if (!settled || !preview) {
    return (
      <div className="flex flex-col items-center gap-4" aria-busy="true">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="mt-4 h-12 w-full" />
      </div>
    );
  }

  const { state } = preview;

  if (state === "own") {
    return (
      <EmptyState
        icon={Link2}
        title="Это ваше приглашение"
        description="Отправьте ссылку партнёру. Открыть и принять её нужно с его аккаунта."
        action={<ButtonLink href="/dashboard">Перейти в пространство</ButtonLink>}
      />
    );
  }

  if (state === "in_couple") {
    return (
      <EmptyState
        icon={Users}
        title="Вы уже состоите в паре"
        description="Чтобы принять это приглашение, сначала расформируйте текущую пару в настройках."
        action={
          <>
            <ButtonLink href="/settings">Открыть настройки</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Назад
            </ButtonLink>
          </>
        }
      />
    );
  }

  if (state !== "valid") return <DeadEnd state={state} href={homeHref} label={homeLabel} />;

  const inviter = preview.inviterName ?? "Ваш партнёр";
  const signedIn = Boolean(workspace.session);

  return (
    <div className="flex flex-col items-center text-center">
      <Avatar name={inviter} size="lg" />
      <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {inviter} приглашает вас в пару
      </h1>
      <p className="mt-3 max-w-sm leading-relaxed text-ink-soft">
        Примите приглашение, и у вас появится общее пространство: счётчик дней и профиль друг друга.
      </p>
      {preview.startDate && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-50 px-4 py-2 text-sm ring-1 ring-accent-100">
          <CalendarDays className="size-4 text-accent-600" aria-hidden />
          Вместе с {formatDateRu(preview.startDate)}
        </p>
      )}

      <div className="mt-8 w-full space-y-3">
        {signedIn ? (
          <>
            {error && <Alert tone="error" className="text-left">{error}</Alert>}
            <Button size="lg" fullWidth onClick={accept} loading={pending}>
              Принять приглашение
            </Button>
            <p className="pt-1 text-sm text-ink-soft">
              Вы вошли как {workspace.profile?.display_name ?? workspace.session?.user.email}.{" "}
              <button type="button" onClick={() => void workspace.signOut()} className="font-medium text-accent-700 hover:underline">
                Это не вы?
              </button>
            </p>
          </>
        ) : (
          <>
            <ButtonLink href={authHref("/register", token)} size="lg" fullWidth>
              Создать аккаунт и принять
            </ButtonLink>
            <ButtonLink href={authHref("/login", token)} variant="secondary" size="lg" fullWidth>
              У меня уже есть аккаунт
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}

function DeadEnd({ state, href, label }: { state: keyof typeof dead; href: string; label: string }) {
  const { icon, title, text } = dead[state];
  return <EmptyState icon={icon} tone="error" title={title} description={text} action={<ButtonLink href={href}>{label}</ButtonLink>} />;
}
