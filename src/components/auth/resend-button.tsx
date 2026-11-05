"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { resendConfirmation } from "@/services/auth";
import { GENERIC_ERROR } from "@/lib/errors";

const COOLDOWN_SECONDS = 60;

/** Повторная отправка письма с подтверждением; не чаще раза в минуту. */
export function ResendButton({ email, redirectPath }: { email: string; redirectPath: string }) {
  const [left, setLeft] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  async function resend() {
    setSending(true);
    setMessage(null);
    try {
      await resendConfirmation(email, `${window.location.origin}${redirectPath}`);
      setMessage({ tone: "success", text: "Письмо отправлено ещё раз. Проверьте также папку «Спам»." });
      setLeft(COOLDOWN_SECONDS);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : GENERIC_ERROR });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="secondary" fullWidth onClick={resend} loading={sending} disabled={left > 0}>
        {left > 0 ? `Отправить снова через ${left} с` : "Отправить письмо ещё раз"}
      </Button>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );
}
