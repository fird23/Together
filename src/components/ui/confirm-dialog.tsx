"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GENERIC_ERROR } from "@/lib/errors";

/** Подтверждение необратимых действий. Показывает ошибку, если действие не удалось. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "danger",
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  /** Блокирует кнопку подтверждения, пока не выполнено условие (например, не введено слово). */
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setError(null);
    onClose();
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={title} description={description}>
      {children}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close} disabled={pending}>
          Отмена
        </Button>
        <Button variant={tone === "danger" ? "danger-solid" : "primary"} onClick={confirm} loading={pending} disabled={confirmDisabled}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
