"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, PartyPopper } from "lucide-react";
import { TextField } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteLinkCard } from "@/components/couple/invite-link-card";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { createCoupleSchema } from "@/lib/validation";
import { createCouple } from "@/services/couple";
import { todayISO } from "@/utils/days";

export function CreateCoupleView() {
  const { couple, refresh } = useWorkspace();
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Если пара уже есть (и мы не на экране «Пара создана»), здесь делать нечего.
  useEffect(() => {
    if (couple && !inviteUrl) router.replace("/dashboard");
  }, [couple, inviteUrl, router]);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(createCoupleSchema, async (data) => {
    const token = await createCouple(data.startDate);
    setInviteUrl(`${window.location.origin}/invite/${token}`);
    await refresh();
  });

  if (couple && !inviteUrl) return <Skeleton className="h-64 w-full" />;

  if (inviteUrl) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <PartyPopper className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Пара создана</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Осталось отправить приглашение партнёру. Когда он откроет ссылку и примет приглашение, у вас появится общее пространство.
        </p>
        <div className="mt-7">
          <InviteLinkCard
            url={inviteUrl}
            note="Ссылка действует 7 дней и сработает только один раз. Позже вы сможете выпустить новую в своём пространстве."
          />
        </div>
        <Alert tone="info" className="mt-4">
          Эту ссылку мы показываем один раз и не храним у себя в открытом виде. Скопируйте её сейчас.
        </Alert>
        <ButtonLink href="/dashboard" size="lg" fullWidth className="mt-7">
          Перейти в пространство
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <Link href="/couple" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Назад
      </Link>
      <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Когда началась ваша история?</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        По этой дате мы посчитаем, сколько дней вы вместе. Её можно будет изменить позже.
      </p>
      <Card padding="lg" className="mt-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <TextField
            name="startDate"
            type="date"
            label="Дата начала отношений"
            icon={CalendarDays}
            max={todayISO()}
            min="1950-01-01"
            error={errors.startDate}
            disabled={pending}
          />
          {formError && <Alert tone="error">{formError}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={pending}>
            Создать пару
          </Button>
        </form>
      </Card>
    </div>
  );
}
