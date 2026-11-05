"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ссылка-приглашение с кнопкой «Копировать». Работает и там, где буфер обмена недоступен. */
export function InviteLinkCard({ url, note }: { url: string; note?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      inputRef.current?.select();
      setFailed(true);
    }
  }

  return (
    <div className="rounded-control bg-accent-50 p-4 ring-1 ring-accent-100">
      <p className="text-sm font-medium">Ссылка для партнёра</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Ссылка-приглашение"
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-control bg-paper px-3.5 text-sm text-ink ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-accent-600"
        />
        <Button variant={copied ? "secondary" : "primary"} onClick={copy} className="sm:w-40">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      {failed && <p className="mt-2 text-sm text-ink-soft">Не удалось скопировать сам. Ссылка выделена, нажмите Ctrl+C (на телефоне долгое нажатие).</p>}
      {note && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{note}</p>}
    </div>
  );
}
