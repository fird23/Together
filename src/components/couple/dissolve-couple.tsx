"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/field";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { dissolveCouple } from "@/services/couple";

const CONFIRM_WORD = "расформировать";

/** Опасная зона: расформирование пары. Требует ввести слово, чтобы нельзя было нажать случайно. */
export function DissolveCouple() {
  const { refresh } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function close() {
    setOpen(false);
    setTyped("");
  }

  async function confirm() {
    await dissolveCouple();
    await refresh();
    router.replace("/couple");
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <HeartCrack className="size-4" aria-hidden /> Расформировать пару
      </Button>
      <ConfirmDialog
        open={open}
        onClose={close}
        onConfirm={confirm}
        confirmDisabled={typed.trim().toLowerCase() !== CONFIRM_WORD}
        title="Расформировать пару?"
        description="Общее пространство закроется для вас обоих, а дата начала отношений и приглашения удалятся. Вернуть это нельзя. Аккаунты останутся, и вы сможете создать новую пару."
        confirmLabel="Расформировать"
      >
        <TextField
          label={`Чтобы подтвердить, введите «${CONFIRM_WORD}»`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
        />
      </ConfirmDialog>
    </>
  );
}
