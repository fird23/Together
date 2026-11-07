"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, PenLine } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { listTalk } from "@/services/talk";
import { cn } from "@/utils/cn";
import type { TalkKind, TalkReply, TalkThread } from "@/types";

<<<<<<< HEAD
const KIND_LABEL: Record<TalkKind, string> = { complain: "Обидки", say: "Сказать", ask: "Спросить", suggest: "Предложить" };
=======
const KIND_LABEL: Record<TalkKind, string> = { complain: "Пожаловаться", say: "Сказать", ask: "Спросить", suggest: "Предложить" };
>>>>>>> e19775e761463478d9365589e97c6beb87d7e79f
const LIMIT = 3;

/** Главная: последние открытые обращения и те, что ждут вашего ответа. */
export function TalkPreview() {
  const { couple, profile, partner } = useWorkspace();
  const [data, setData] = useState<{ threads: TalkThread[]; replies: TalkReply[] } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!couple) return;
    try { setData(await listTalk(couple.id)); setError(""); }
    catch (e) { setData((prev) => prev ?? { threads: [], replies: [] }); setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("talk_threads", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });
  useRealtime("talk_replies", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  if (!couple || !profile) return null;
  const partnerName = partner?.display_name ?? "Партнёр";
  const open = (data?.threads ?? []).filter((t) => !t.resolved);
  // Ждёт ответа от вас: последнее слово в обращении не ваше.
  const lastAuthor = (t: TalkThread) => {
    const replies = (data?.replies ?? []).filter((r) => r.thread_id === t.id);
    return replies.length ? replies[replies.length - 1].author_id : t.author_id;
  };
  const waiting = open.filter((t) => lastAuthor(t) !== profile.id);
  const shown = [...waiting, ...open.filter((t) => !waiting.includes(t))].slice(0, LIMIT);

  return (
    <section className="dashboard-card dash-preview">
      <div className="dash-preview-head">
        <p>{waiting.length > 0 ? <strong className="text-accent-700">Ждут вашего ответа: {waiting.length}</strong> : open.length > 0 ? "Открытых обращений: " + open.length : "Здесь можно сказать то, что не всегда находится момент"}</p>
        <Link href="/talk#new" className="dash-write"><PenLine size={14} /> Написать</Link>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {data === null ? (
        <p className="mt-3 text-sm text-ink-soft">Загружаем…</p>
      ) : shown.length === 0 ? (
        <div className="dash-preview-empty"><Illustration kind="talk" className="h-20 w-28" /><p>Пока тихо. Напишите партнёру, и он ответит здесь.</p></div>
      ) : (
        <ul className="dash-talk-list">
          {shown.map((t) => {
            const mine = t.author_id === profile.id;
            const needsMe = waiting.includes(t);
            return (
              <li key={t.id}>
                <Link href="/talk" className={cn(needsMe && "needs-me")}>
                  <span className="dash-talk-kind">{KIND_LABEL[t.kind]}<em>{mine ? "Вы" : partnerName}</em></span>
                  <span className="dash-talk-body">{t.body}</span>
                  <span className="dash-talk-state">{needsMe ? "Ждёт вашего ответа" : "Идёт разговор"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/talk" className="calendar-open-link">Открыть разговоры <ArrowUpRight size={14} /></Link>
    </section>
  );
}
