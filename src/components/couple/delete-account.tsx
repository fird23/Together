"use client";

import { useState } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/field";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { deleteAccount } from "@/services/profile";

const CONFIRM_WORD = "удалить";

/** Удаление профиля. Двойная защита: объяснение последствий и ввод слова. */
export function DeleteAccount() {
  const { profile, partner, signOut } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function close() {
    setOpen(false);
    setTyped("");
  }

  async function confirm() {
    await deleteAccount(profile?.avatar_url ?? null);
    await signOut(); // сессии больше нет, провайдер уведёт на главную
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <UserX className="size-4" aria-hidden /> Удалить профиль
      </Button>
      <ConfirmDialog
        open={open}
        onClose={close}
        onConfirm={confirm}
        confirmDisabled={typed.trim().toLowerCase() !== CONFIRM_WORD}
        title="Удалить профиль навсегда?"
        description="Это действие нельзя отменить."
        confirmLabel="Удалить профиль"
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Аккаунт, имя и фото будут удалены сразу.</li>
          <li>Исчезнут ваши личные привычки, отметки, настроение и вишлист.</li>
          <li>
            {partner
              ? `${partner.display_name} останется в общем пространстве: общие привычки и пометки календаря сохранятся.`
              : "Если вы были в паре, общее пространство будет удалено."}
          </li>
        </ul>
        <TextField
          className="mt-5"
          label={`Чтобы подтвердить, введите «${CONFIRM_WORD}»`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
        />
      </ConfirmDialog>
    </>
  );
}
