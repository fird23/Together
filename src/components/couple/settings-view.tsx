"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { AppearanceSettings } from "@/components/couple/appearance-settings";
import { ChangePasswordForm } from "@/components/couple/change-password-form";
import { DissolveCouple } from "@/components/couple/dissolve-couple";
import { formatDateRu, todayISO } from "@/utils/days";

export function SettingsView() {
  const { profile, partner, couple, session, memberCount } = useWorkspace();
  if (!profile || !session) return null;
  const email = profile.email || session.user.email || "";

  return (
    <div className="max-w-2xl">
      <PageHeader title="Настройки" description="Оформление, аккаунт и ваша пара." />

      <Card padding="lg" className="divide-y divide-sand-200 [&>section]:py-8 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
        <section aria-labelledby="appearance-title">
          <h2 id="appearance-title" className="mb-5 font-serif text-xl font-semibold">
            Оформление
          </h2>
          <AppearanceSettings />
        </section>

        <section aria-labelledby="account-title">
          <h2 id="account-title" className="font-serif text-xl font-semibold">
            Аккаунт
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-ink-soft">Email</dt>
              <dd className="font-medium">{email}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <dt className="text-ink-soft">Имя</dt>
              <dd className="flex items-center gap-3 font-medium">
                {profile.display_name}
                <ButtonLink href="/profile" variant="ghost" size="sm">
                  Изменить
                </ButtonLink>
              </dd>
            </div>
          </dl>
          <h3 className="mb-4 mt-8 font-medium">Смена пароля</h3>
          <ChangePasswordForm email={email} />
        </section>

        <section aria-labelledby="couple-title">
          <h2 id="couple-title" className="font-serif text-xl font-semibold">
            Ваша пара
          </h2>
          {couple ? (
            <dl className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <dt className="text-ink-soft">Участники</dt>
                <dd className="flex items-center gap-2">
                  <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
                  {partner ? (
                    <Avatar name={partner.display_name} src={partner.avatar_url} size="sm" />
                  ) : null}
                  <span className="font-medium">
                    {profile.display_name}
                    {partner ? ` и ${partner.display_name}` : ""}
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                <dt className="text-ink-soft">Начало отношений</dt>
                <dd className="font-medium">{formatDateRu(couple.start_date)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                <dt className="text-ink-soft">Пара создана</dt>
                <dd className="font-medium">{formatDateRu(todayISO(new Date(couple.created_at)))}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                <dt className="text-ink-soft">Статус</dt>
                <dd className="font-medium">{memberCount >= 2 ? "Оба участника подключены" : "Ждём партнёра"}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3">
              <p className="leading-relaxed text-ink-soft">Вы пока не в паре.</p>
              <ButtonLink href="/couple" variant="secondary" size="sm" className="mt-4">
                Подключиться к паре
              </ButtonLink>
            </div>
          )}
        </section>
      </Card>

      {couple && (
        <section aria-labelledby="danger-title" className="mt-6 rounded-card bg-danger-soft/60 p-6 ring-1 ring-danger/20 sm:p-7">
          <h2 id="danger-title" className="font-serif text-xl font-semibold text-danger">
            Расформирование пары
          </h2>
          <p className="mb-5 mt-2 max-w-lg leading-relaxed text-ink-soft">
            Пара будет удалена у вас обоих. Это действие нельзя отменить, поэтому мы попросим подтверждение.
          </p>
          <DissolveCouple />
        </section>
      )}
    </div>
  );
}
