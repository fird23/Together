"use client";

import { useEffect, useState } from "react";
import { Link2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InviteLinkCard } from "@/components/couple/invite-link-card";
import { getPendingInvitationExpiry, regenerateInvitation, revokeInvitation } from "@/services/couple";
import { GENERIC_ERROR } from "@/lib/errors";
import { formatDateRu, todayISO } from "@/utils/days";

const untilText = (iso: string) => `до ${formatDateRu(todayISO(new Date(iso)))}`;

/** Что с приглашением: активно, не создано или только что выпущено новое. */
export function InviteManager({ coupleId }: { coupleId: string }) {
  const [expiry, setExpiry] = useState<string | null | undefined>(undefined); // undefined — ещё грузим
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPendingInvitationExpiry()
      .then((value) => !cancelled && setExpiry(value))
      .catch((e: unknown) => {
        if (cancelled) return;
        setExpiry(null);
        setError(e instanceof Error ? e.message : GENERIC_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const token = await regenerateInvitation(coupleId);
      setFreshUrl(`${window.location.origin}/invite/${token}`);
      setExpiry(await getPendingInvitationExpiry());
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    await revokeInvitation();
    setFreshUrl(null);
    setExpiry(null);
    setError(null);
  }

  return (
    <Card padding="lg" className="mt-6">
      <h2 className="flex items-center gap-2.5 font-serif text-xl font-semibold">
        <Link2 className="size-5 text-accent-600" aria-hidden /> Приглашение для партнёра
      </h2>

      <div className="mt-5 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        {expiry === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : freshUrl ? (
          <InviteLinkCard
            url={freshUrl}
            note={`Ссылка действует ${expiry ? untilText(expiry) : "7 дней"} и сработает один раз. Предыдущая ссылка больше не работает.`}
          />
        ) : expiry ? (
          <Alert tone="info" title={`Ссылка активна ${untilText(expiry)}`}>
            Саму ссылку мы не храним, поэтому показать её ещё раз нельзя. Если вы её потеряли, создайте новую: старая перестанет работать.
          </Alert>
        ) : (
          <Alert tone="info" title="Активной ссылки нет">
            Создайте ссылку и отправьте её партнёру, чтобы он мог присоединиться.
          </Alert>
        )}

        {expiry !== undefined && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant={expiry || freshUrl ? "secondary" : "primary"} onClick={create} loading={busy}>
              <RefreshCw className="size-4" aria-hidden /> {expiry || freshUrl ? "Создать новую ссылку" : "Создать ссылку"}
            </Button>
            {(expiry || freshUrl) && (
              <Button variant="ghost" onClick={() => setConfirmOpen(true)} disabled={busy}>
                <XCircle className="size-4" aria-hidden /> Отменить приглашение
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={revoke}
        title="Отменить приглашение?"
        description="Ссылка перестанет работать. Вы сможете создать новую в любой момент."
        confirmLabel="Отменить приглашение"
      />
    </Card>
  );
}
