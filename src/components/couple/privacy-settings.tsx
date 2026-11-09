"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { getShareWishlistMarks, setShareWishlistMarks } from "@/services/privacy";

/** Личные настройки приватности: действуют только на ваши данные. */
export function PrivacySettings() {
  const { profile } = useWorkspace();
  const [share, setShare] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getShareWishlistMarks(userId)
      .then((v) => { if (alive) { setShare(v); setLoaded(true); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : GENERIC_ERROR); });
    return () => { alive = false; };
  }, [userId]);

  async function change(next: boolean) {
    if (!userId) return;
    setBusy(true); setError("");
    try { await setShareWishlistMarks(userId, next); setShare(next); }
    catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Eye className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Партнёр видит мои отметки в вишлистах</p>
          <p className="text-sm text-ink-soft">
            {share
              ? "Партнёр видит, какие из его желаний вы отметили."
              : "Сейчас отметки видите только вы: партнёр не узнает, что вы отметили."}
          </p>
        </div>
        <Switch checked={share} onChange={(v) => void change(v)} disabled={busy || !loaded} label="Партнёр видит мои отметки в вишлистах" />
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </div>
  );
}
