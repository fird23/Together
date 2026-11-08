"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, HeartHandshake, Smartphone, KeyRound, LayoutGrid, LifeBuoy, Palette, ShieldAlert, UserRound, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { AppearanceSettings } from "@/components/couple/appearance-settings";
import { ChangePasswordForm } from "@/components/couple/change-password-form";
import { DissolveCouple } from "@/components/couple/dissolve-couple";
import { DeleteAccount } from "@/components/couple/delete-account";
import { NotificationSettings } from "@/components/couple/notification-settings";
import { NativeAppSettings } from "@/components/native/native-app-settings";
import { isNativeApp } from "@/lib/native";
import { FeatureSettings } from "@/components/couple/feature-settings";
import { EditStartDate } from "@/components/couple/edit-start-date";
import { formatDateRu, todayISO } from "@/utils/days";
import { cn } from "@/utils/cn";

function Section({
  id, icon: Icon, title, description, tone = "default", children,
}: {
  id: string; icon: LucideIcon; title: string; description?: string; tone?: "default" | "danger"; children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 rounded-card p-5 shadow-soft ring-1 sm:p-6", tone === "danger" ? "bg-danger-soft/50 ring-danger/20" : "bg-paper ring-sand-200")}
    >
      <header className="mb-5 flex items-start gap-3.5">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-100 text-accent-700")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id={`${id}-title`} className={cn("font-serif text-xl font-semibold", tone === "danger" && "text-danger")}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-sand-100 py-3 first:pt-0 last:border-0 last:pb-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="flex items-center gap-3 font-medium">{children}</dd>
    </div>
  );
}

function ActionRow({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-danger/15 py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const { profile, partner, couple, session, memberCount } = useWorkspace();
  const [active, setActive] = useState("appearance");
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  const hasCouple = Boolean(couple);

  // Подсвечиваем в боковом меню раздел, который сейчас на экране.
  useEffect(() => {
    const ids = ["appearance", "notifications", ...(native ? ["app"] : []), ...(hasCouple ? ["features"] : []), "account", "security", "couple", "danger"];
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const visible = new Set<string>();
    const pick = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) return setActive(ids[ids.length - 1]);
      const first = ids.find((id) => visible.has(id));
      if (first) setActive(first);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
      pick();
    }, { rootMargin: "-96px 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    window.addEventListener("scroll", pick, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", pick); };
  }, [hasCouple, native]);

  if (!profile || !session) return null;
  const email = profile.email || session.user.email || "";

  const nav = [
    { id: "appearance", label: "Оформление", icon: Palette },
    { id: "notifications", label: "Уведомления", icon: Bell },
    ...(native ? [{ id: "app", label: "Приложение", icon: Smartphone }] : []),
    ...(couple ? [{ id: "features", label: "Функции", icon: LayoutGrid }] : []),
    { id: "account", label: "Аккаунт", icon: UserRound },
    { id: "security", label: "Безопасность", icon: KeyRound },
    { id: "couple", label: "Ваша пара", icon: HeartHandshake },
    { id: "danger", label: "Опасная зона", icon: ShieldAlert },
  ];

  return (
    <div>
      <PageHeader title="Настройки" description="Оформление, аккаунт и ваша пара." />

      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Разделы настроек" className="settings-nav hidden lg:sticky lg:top-24 lg:block">
          <ul className="space-y-1">
            {nav.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a href={`#${id}`} onClick={() => setActive(id)} aria-current={active === id ? "location" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-100 hover:text-ink">
                  <Icon className="size-[18px]" aria-hidden /> {label}
                </a>
              </li>
            ))}
          </ul>
          <Link href="/support" className="mt-4 flex items-center gap-3 rounded-xl bg-accent-50 px-3 py-3 text-sm font-medium text-accent-700 ring-1 ring-accent-100 hover:bg-accent-100">
            <LifeBuoy className="size-[18px]" aria-hidden /> Нужна помощь?
          </Link>
        </nav>

        <div className="max-w-3xl space-y-5">
          <Section id="appearance" icon={Palette} title="Оформление" description="Режим и цветовая тема приложения.">
            <AppearanceSettings />
          </Section>

          <Section id="notifications" icon={Bell} title="Уведомления" description="О чём напоминать и куда присылать. Настройки только ваши.">
            <NotificationSettings />
          </Section>

          {native && (
            <Section id="app" icon={Smartphone} title="Приложение" description="Виджет и возможности Android-версии.">
              <NativeAppSettings />
            </Section>
          )}

          {couple && (
            <Section id="features" icon={LayoutGrid} title="Функции" description="Что показывать на главной у вас двоих.">
              <FeatureSettings />
            </Section>
          )}

          <Section id="account" icon={UserRound} title="Аккаунт" description="Так вас видит партнёр.">
            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-milk p-4">
              <Avatar name={profile.display_name} src={profile.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{profile.display_name}</p>
                <p className="truncate text-sm text-ink-soft">{email}</p>
              </div>
              <ButtonLink href="/profile" variant="secondary" size="sm">Изменить</ButtonLink>
            </div>
            <dl>
              <Row label="Email">{email}</Row>
              <Row label="Имя">{profile.display_name}</Row>
            </dl>
          </Section>

          <Section id="security" icon={KeyRound} title="Безопасность" description="Смена пароля: сначала подтвердите текущий.">
            <ChangePasswordForm email={email} />
          </Section>

          <Section id="couple" icon={HeartHandshake} title="Ваша пара">
            {couple ? (
              <dl>
                <Row label="Участники">
                  <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
                  {partner && <Avatar name={partner.display_name} src={partner.avatar_url} size="sm" />}
                  <span>{profile.display_name}{partner ? ` и ${partner.display_name}` : ""}</span>
                </Row>
                <Row label="Начало отношений">
                  {formatDateRu(couple.start_date)}
                  <EditStartDate couple={couple} />
                </Row>
                <Row label="Пара создана">{formatDateRu(todayISO(new Date(couple.created_at)))}</Row>
                <Row label="Статус">{memberCount >= 2 ? "Оба участника подключены" : "Ждём партнёра"}</Row>
              </dl>
            ) : (
              <div>
                <p className="leading-relaxed text-ink-soft">Вы пока не в паре.</p>
                <ButtonLink href="/couple" variant="secondary" size="sm" className="mt-4">Подключиться к паре</ButtonLink>
              </div>
            )}
          </Section>

          <Section id="danger" icon={ShieldAlert} tone="danger" title="Опасная зона" description="Эти действия нельзя отменить, поэтому мы попросим подтверждение.">
            {couple && (
              <ActionRow title="Расформировать пару" text="Пара будет удалена у вас обоих. Аккаунты останутся, и можно создать новую пару.">
                <DissolveCouple />
              </ActionRow>
            )}
            <ActionRow title="Удалить профиль" text="Аккаунт и ваши личные данные будут удалены навсегда. Партнёр сохранит общее пространство.">
              <DeleteAccount />
            </ActionRow>
          </Section>
        </div>
      </div>
    </div>
  );
}
