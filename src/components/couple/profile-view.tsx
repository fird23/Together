"use client";

import { useState } from "react";
import { LogOut, Pencil, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { TextField } from "@/components/ui/field";
import { AvatarPicker } from "@/components/couple/avatar-picker";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { profileNameSchema } from "@/lib/validation";
import { setPartnerAlias, updateDisplayName } from "@/services/profile";
import { formatDateRu, todayISO } from "@/utils/days";

const joined = (iso: string) => formatDateRu(todayISO(new Date(iso)));

export function ProfileView() {
  const { profile, partner, session, couple, refresh, signOut } = useWorkspace();
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [alias, setAlias] = useState<string | null>(null); // null: поле не трогали, показываем текущее
  const [aliasPending, setAliasPending] = useState(false);
  const [aliasMsg, setAliasMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { errors, formError, pending, handleSubmit } = useValidatedForm(profileNameSchema, async (data) => {
    setSaved(false);
    if (!session) return;
    await updateDisplayName(session.user.id, data.name);
    await refresh();
    setSaved(true);
  });

  if (!profile || !session) return null;

  const realName = partner?.real_name ?? partner?.display_name ?? "";
  const hasAlias = Boolean(partner && partner.display_name !== realName);
  const aliasValue = alias ?? (hasAlias ? (partner?.display_name ?? "") : "");

  async function saveAlias(next: string | null) {
    if (!partner) return;
    setAliasPending(true); setAliasMsg(null);
    try {
      await setPartnerAlias(session!.user.id, partner.id, next);
      await refresh();
      setAlias(null);
      setAliasMsg({ ok: true, text: next?.trim() ? "Готово. Теперь вы видите партнёра под этим именем." : "Вернули настоящее имя партнёра." });
    } catch (e) {
      setAliasMsg({ ok: false, text: e instanceof Error ? e.message : "Не удалось сохранить имя." });
    }
    setAliasPending(false);
  }

  async function logout() {
    setLeaving(true);
    await signOut(); // после выхода провайдер сам ведёт на главную
  }

  return (
    <div>
      <PageHeader title="Профиль" description="Так вас видит партнёр." />
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card padding="lg">
          <div className="flex items-center gap-4">
            <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-serif text-2xl font-semibold">{profile.display_name}</p>
              <p className="truncate text-ink-soft">{profile.email || session.user.email}</p>
              <p className="mt-1 text-sm text-ink-faint">В Together с {joined(profile.created_at)}</p>
            </div>
          </div>
          <div className="mt-6">
            <AvatarPicker userId={session.user.id} path={profile.avatar_url} />
          </div>
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 border-t border-sand-200 pt-6">
            <TextField
              key={profile.display_name}
              name="name"
              label="Имя или никнейм"
              icon={UserRound}
              defaultValue={profile.display_name}
              autoComplete="given-name"
              error={errors.name}
              disabled={pending}
            />
            {formError && <Alert tone="error">{formError}</Alert>}
            {saved && !formError && <Alert tone="success">Имя сохранено. Партнёр увидит его сразу.</Alert>}
            <Button type="submit" loading={pending}>
              Сохранить имя
            </Button>
          </form>
        </Card>

        <aside className="rounded-card bg-accent-50 p-6 ring-1 ring-accent-100 sm:p-7">
          <h2 className="font-serif text-xl font-semibold">Ваш партнёр</h2>
          {partner ? (
            <div className="mt-5 flex items-center gap-4">
              <Avatar name={partner.display_name} src={partner.avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-serif text-xl font-semibold">{partner.display_name}</p>
                {hasAlias && <p className="truncate text-sm text-ink-soft">Настоящее имя: {realName}</p>}
                <p className="text-sm text-ink-soft">В Together с {joined(partner.created_at)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="leading-relaxed text-ink-soft">
                {couple ? "Партнёр ещё не принял приглашение." : "Вы пока не в паре. Создайте пару или примите приглашение."}
              </p>
              <ButtonLink href={couple ? "/dashboard" : "/couple"} variant="secondary" size="sm" className="mt-4">
                {couple ? "Открыть приглашение" : "Подключиться к паре"}
              </ButtonLink>
            </div>
          )}
          {partner && (
            <form
              className="mt-5 space-y-3 border-t border-accent-100 pt-5"
              onSubmit={(e) => { e.preventDefault(); void saveAlias(aliasValue); }}
            >
              <TextField
                name="partner-alias"
                label="Как вы называете партнёра"
                icon={Pencil}
                value={aliasValue}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={40}
                placeholder={realName}
                disabled={aliasPending}
              />
              <p className="text-xs leading-relaxed text-ink-soft">Это имя видите только вы: в приложении и в уведомлениях. Партнёр его не увидит, а его настоящее имя не изменится.</p>
              {aliasMsg && <Alert tone={aliasMsg.ok ? "success" : "error"}>{aliasMsg.text}</Alert>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" loading={aliasPending} disabled={!aliasValue.trim() || aliasValue.trim() === partner.display_name}>Сохранить</Button>
                {hasAlias && <Button type="button" size="sm" variant="secondary" onClick={() => void saveAlias(null)} disabled={aliasPending}>Вернуть настоящее имя</Button>}
              </div>
            </form>
          )}
        </aside>
      </div>

      <div className="mt-10 border-t border-sand-200 pt-6">
        <Button variant="secondary" onClick={logout} loading={leaving}>
          <LogOut className="size-4" aria-hidden /> Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}
