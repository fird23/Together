"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CloudRain, HelpCircle, Lightbulb, MessageCircle, RotateCcw, Send, Trash2, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Illustration } from "@/components/ui/illustrations";
import { FeatureOff } from "@/components/ui/feature-off";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { deleteThread, listTalk, reply, setResolved, startThread } from "@/services/talk";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";
import type { TalkKind, TalkReply, TalkThread } from "@/types";

const KINDS: { id: TalkKind; label: string; icon: LucideIcon; hint: string; quick: string[] }[] = [
  { id: "complain", label: "Пожаловаться", icon: CloudRain, hint: "Что вас расстроило? Лучше спокойно и без обвинений…", quick: ["Слышу тебя 💜", "Прости, давай обсудим", "Спасибо, что сказал(а)"] },
  { id: "say", label: "Сказать", icon: MessageCircle, hint: "Что хочется сказать партнёру?", quick: ["Спасибо, приятно 💜", "Я тебя тоже", "Давай поговорим об этом"] },
  { id: "ask", label: "Спросить", icon: HelpCircle, hint: "О чём хотите спросить?", quick: ["Да", "Нет", "Давай обсудим вечером"] },
  { id: "suggest", label: "Предложить", icon: Lightbulb, hint: "Что предлагаете сделать или изменить?", quick: ["Отличная идея!", "Давай попробуем", "Давай подумаем"] },
];

const when = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(".", "");

export function TalkView() {
  const { couple, profile, partner } = useWorkspace();
  const [data, setData] = useState<{ threads: TalkThread[]; replies: TalkReply[] } | null>(null);
  const [kind, setKind] = useState<TalkKind>("say");
  const [body, setBody] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const ready = Boolean(couple && profile);
  useEffect(() => { if (ready && window.location.hash === "#new") bodyRef.current?.focus(); }, [ready]);

  const load = useCallback(async () => {
    if (!couple) return;
    try { setData(await listTalk(couple.id)); setError(""); }
    catch (e) { setData((prev) => prev ?? { threads: [], replies: [] }); setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("talk_threads", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });
  useRealtime("talk_replies", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  if (!couple || !profile) return null;
  if (!featureOn(couple, "talk")) return <FeatureOff kind="talk" title="Разговоры" />;

  const partnerName = partner?.display_name ?? "Партнёр";
  const nameOf = (id: string) => (id === profile.id ? "Вы" : partnerName);
  const current = KINDS.find((k) => k.id === kind)!;
  const threads = data?.threads ?? [];
  const open = threads.filter((t) => !t.resolved);
  const resolved = threads.filter((t) => t.resolved);
  const repliesOf = (id: string) => (data?.replies ?? []).filter((r) => r.thread_id === id);

  async function run(task: () => Promise<void>) {
    setError("");
    try { await task(); await load(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || !couple || !profile) return;
    setBusy(true);
    await run(async () => { await startThread(couple.id, profile.id, kind, body); setBody(""); });
    setBusy(false);
  }

  const send = (threadId: string, text: string) => {
    if (!text.trim() || !couple || !profile) return;
    setDrafts((d) => ({ ...d, [threadId]: "" }));
    void run(() => reply(couple.id, threadId, profile.id, text));
  };

  const renderThread = (t: TalkThread) => {
    const kindInfo = KINDS.find((k) => k.id === t.kind)!;
    const replies = repliesOf(t.id);
    const mine = t.author_id === profile.id;
    const waiting = !t.resolved && replies.length === 0;
    return (
      <li key={t.id} className={cn("rounded-card bg-paper p-4 shadow-soft ring-1 sm:p-5", waiting && !mine ? "ring-2 ring-accent-600" : "ring-sand-200")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-sm font-semibold text-accent-700"><kindInfo.icon className="size-4" aria-hidden />{kindInfo.label}</span>
          <span className="text-xs text-ink-faint">{nameOf(t.author_id)} · {when(t.created_at)}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{t.body}</p>
        <p className="mt-2 text-xs font-semibold">
          {t.resolved ? <span className="text-success">Решено ✓</span> : waiting ? <span className={mine ? "text-ink-faint" : "text-accent-700"}>{mine ? `Ждёт ответа от ${partnerName}` : "Ждёт вашего ответа"}</span> : <span className="text-ink-faint">Идёт разговор</span>}
        </p>

        {replies.length > 0 && (
          <ul className="mt-3 space-y-2 border-l-2 border-sand-200 pl-3">
            {replies.map((r) => (
              <li key={r.id} className={cn("max-w-[92%] rounded-2xl px-3.5 py-2 text-sm", r.author_id === profile.id ? "ml-auto bg-accent-100 text-ink" : "bg-sand-100 text-ink")}>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{r.body}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{nameOf(r.author_id)} · {when(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}

        {!t.resolved && (
          <div className="mt-3">
            {!mine && (
              <div className="mb-2 flex flex-wrap gap-2">
                {kindInfo.quick.map((q) => <button type="button" key={q} onClick={() => send(t.id, q)} className="rounded-full bg-sand-100 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-accent-100 hover:text-accent-700">{q}</button>)}
              </div>
            )}
            <div className="flex gap-2">
              <input value={drafts[t.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(t.id, drafts[t.id] ?? ""); } }} maxLength={1000} placeholder="Ответить…" aria-label="Ответ" className="hb-input flex-1" />
              <button type="button" onClick={() => send(t.id, drafts[t.id] ?? "")} disabled={!(drafts[t.id] ?? "").trim()} aria-label="Отправить ответ" className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-accent-600 text-on-accent disabled:opacity-50"><Send className="size-4" aria-hidden /></button>
            </div>
          </div>
        )}

        {mine && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-sand-100 pt-3 text-sm">
            <button type="button" onClick={() => void run(() => setResolved(t.id, !t.resolved))} className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-ink">
              {t.resolved ? <><RotateCcw className="size-4" aria-hidden />Открыть снова</> : <><CheckCircle2 className="size-4" aria-hidden />Отметить решённым</>}
            </button>
            <button type="button" onClick={() => { if (window.confirm("Удалить это обращение вместе с ответами?")) void run(() => deleteThread(t.id)); }} className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-danger"><Trash2 className="size-4" aria-hidden />Удалить</button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Разговоры" description="Место, где можно спокойно пожаловаться, сказать, спросить или предложить. Партнёр ответит, когда будет готов." />

      <form onSubmit={submit} className="mb-8 rounded-card bg-paper p-4 shadow-soft ring-1 ring-sand-200 sm:p-5">
        <fieldset>
          <legend className="sr-only">О чём вы хотите поговорить</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KINDS.map(({ id, label, icon: Icon }) => (
              <label key={id} className="cursor-pointer">
                <input type="radio" name="talk-kind" checked={kind === id} onChange={() => setKind(id)} className="peer sr-only" />
                <span className="flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium text-ink-soft ring-1 ring-sand-200 transition peer-checked:bg-accent-50 peer-checked:text-accent-700 peer-checked:ring-2 peer-checked:ring-accent-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-600"><Icon className="size-4" aria-hidden />{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder={current.hint} aria-label="Сообщение партнёру" className="cal-textarea mt-3" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">{body.trim().length} / 1000</p>
          <button disabled={!body.trim() || busy} className="hb-submit mt-0! w-auto! px-6"><Send className="mr-1.5 inline size-4" aria-hidden />Отправить</button>
        </div>
      </form>

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {data === null ? <p className="text-sm text-ink-soft">Загружаем…</p> : open.length === 0 && resolved.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-sand-300 px-5 py-10 text-center text-sm leading-relaxed text-ink-faint">
          <Illustration kind="talk" />
          <p className="mt-2 max-w-sm">Здесь пока тихо. Напишите то, что хочется сказать, но не всегда находится момент.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">{open.map(renderThread)}</ul>
          {resolved.length > 0 && (
            <div className="mt-6">
              <button type="button" onClick={() => setShowResolved((v) => !v)} className="text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">{showResolved ? "Скрыть решённые" : `Решённые (${resolved.length})`}</button>
              {showResolved && <ul className="mt-4 space-y-4 opacity-80">{resolved.map(renderThread)}</ul>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
