"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TextField } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { joinInviteSchema } from "@/lib/validation";
import { extractInviteToken } from "@/lib/invite";

/** Первый экран после регистрации: создать пару или присоединиться по приглашению. */
export function ConnectView() {
  const { couple, profile } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (couple) router.replace("/dashboard");
  }, [couple, router]);

  const { errors, formError, handleSubmit } = useValidatedForm(joinInviteSchema, async (data) => {
    const token = extractInviteToken(data.invite);
    if (token) router.push(`/invite/${token}`);
  });

  if (couple) return <Skeleton className="h-64 w-full" />;

  const name = profile?.display_name;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {name ? `${name}, подключимся к паре?` : "Подключимся к паре?"}
      </h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Общее пространство появится, когда в паре будет два человека. Один создаёт пару, второй присоединяется по ссылке.
      </p>

      <Card padding="lg" className="mt-8">
        <span className="grid size-11 place-items-center rounded-full bg-accent-100 text-accent-700">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 font-serif text-xl font-semibold">Создать пару</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          Укажете дату начала отношений и получите ссылку-приглашение, которую нужно отправить партнёру.
        </p>
        <ButtonLink href="/couple/new" size="lg" className="mt-6 w-full sm:w-auto">
          Создать пару <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </Card>

      <div className="my-7 flex items-center gap-4 text-sm text-ink-faint" aria-hidden>
        <span className="h-px flex-1 bg-sand-300" />
        или
        <span className="h-px flex-1 bg-sand-300" />
      </div>

      <div className="rounded-card bg-accent-50 p-5 ring-1 ring-accent-100 sm:p-6">
        <h2 className="font-serif text-xl font-semibold">У меня есть приглашение</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          Партнёр уже создал пару? Вставьте ссылку, которую он вам отправил.
        </p>
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3">
          <TextField
            name="invite"
            label="Ссылка-приглашение"
            icon={Link2}
            placeholder="https://…/invite/…"
            autoComplete="off"
            error={errors.invite}
          />
          {formError && <Alert tone="error">{formError}</Alert>}
          <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto">
            Продолжить
          </Button>
        </form>
      </div>
    </div>
  );
}
