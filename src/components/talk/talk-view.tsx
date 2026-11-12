"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CheckCircle2, CloudRain, HelpCircle, ImagePlus, Lightbulb, MessageCircle, Pencil, RotateCcw, Send, Trash2, X, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Illustration } from "@/components/ui/illustrations";
import { FeatureOff } from "@/components/ui/feature-off";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { deleteThread, listTalk, reply, setResolved, startThread } from "@/services/talk";
import { compressImage } from "@/lib/image";
import { editReply, editThread } from "@/services/talk";
import { removeTalkImages, talkImageUrls, uploadTalkImage } from "@/services/talk-media";
import { featureOn } from "@/utils/features";
import { ViewableImage } from "@/components/ui/viewable-image";
import { cn } from "@/utils/cn";
import type { TalkKind, TalkReply, TalkThread } from "@/types";

const KINDS: { id: TalkKind; label: string; icon: LucideIcon; hint: string; quick: string[] }[] = [
  { id: "complain", label: "Обидки", icon: CloudRain, hint: "Что вас обидело? Лучше спокойно и без обвинений…", quick: ["Слышу тебя 💜", "Прости, давай обсудим", "Спасибо, что сказал(а)"] },
  { id: "say", label: "Сказать", icon: MessageCircle, hint: "Что хочется сказать партнёру?", quick: ["Спасибо, приятно 💜", "Я тебя тоже", "Давай поговорим об этом"] },
  { id: "ask", label: "Спросить", icon: HelpCircle, hint: "О чём хотите спросить?", quick: ["Да", "Нет", "Давай обсудим вечером"] },
  { id: "suggest", label: "Предложить", icon: Lightbulb, hint: "Что предлагаете сделать или изменить?", quick: ["Отличная идея!", "Давай попробуем", "Давай подумаем"] },
];

type Attachment = { blob: Blob; preview: string };
const PHOTO_TEXT = "📷 Фото";
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
  const [editing, setEditing] = useState<{ kind: "thread" | "reply"; id: string } | null>(null);
  const [editText, setEditText] = useState("");

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [replyMedia, setReplyMedia] = useState<Record<string, Attachment>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const pickFor = useRef("new");
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const ready = Boolean(couple && profile);
  useEffect(() => { if (ready && window.location.hash === "#new") bodyRef.current?.focus(); }, [ready]);

  const load = useCallback(async () => {
    if (!couple) return;
    try { setData(await listTalk(couple.id)); setError(""); }
    catch (e) { setData((prev) => prev ?? { threads: [], replies: [] }); setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple]);
  useEffect(() => { void load(); }, [load]);
  // Ссылки на фото из закрытого хранилища (обновляем, когда появляются новые снимки)
  useEffect(() => {
    if (!data) return;
    const paths = [...data.threads.map((t) => t.media_path), ...data.replies.map((r) => r.media_path)].filter((p): p is string => Boolean(p) && !urls[p as string]);
    if (paths.length === 0) return;
    let cancelled = false;
    void talkImageUrls(paths).then((map) => { if (!cancelled) setUrls((old) => ({ ...old, ...map })); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
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

  const choose = (target: string) => { pickFor.current = target; fileInput.current?.click(); };

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const blob = await compressImage(file, { maxSide: 1200, maxBytes: 400 * 1024 });
      const item = { blob, preview: URL.createObjectURL(blob) };
      if (pickFor.current === "new") setAttachment((old) => { if (old) URL.revokeObjectURL(old.preview); return item; });
      else setReplyMedia((m) => ({ ...m, [pickFor.current]: item }));
    } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!body.trim() && !attachment) || !couple || !profile) return;
    setBusy(true);
    await run(async () => {
      const path = attachment ? await uploadTalkImage(couple.id, attachment.blob) : null;
      try { await startThread(couple.id, profile.id, kind, body.trim() || PHOTO_TEXT, path); }
      catch (e) { if (path) await removeTalkImages([path]); throw e; }
      setBody(""); setAttachment(null);
    });
    setBusy(false);
  }

  const send = (threadId: string, text: string) => {
    const media = replyMedia[threadId];
    if ((!text.trim() && !media) || !couple || !profile) return;
    setDrafts((d) => ({ ...d, [threadId]: "" }));
    setReplyMedia((m) => { const next = { ...m }; delete next[threadId]; return next; });
    void run(async () => {
      const path = media ? await uploadTalkImage(couple.id, media.blob) : null;
      try { await reply(couple.id, threadId, profile.id, text.trim() || PHOTO_TEXT, path); }
      catch (e) { if (path) await removeTalkImages([path]); throw e; }
    });
  };

  const startEdit = (kind: "thread" | "reply", id: string, text: string) => { setEditing({ kind, id }); setEditText(text === PHOTO_TEXT ? "" : text); };
  const saveEdit = (hasMedia: boolean) => {
    if (!editing) return;
    const text = editText.trim() || (hasMedia ? PHOTO_TEXT : "");
    if (!text) return;
    void run(async () => { await (editing.kind === "thread" ? editThread(editing.id, text) : editReply(editing.id, text)); setEditing(null); });
  };
  const editor = (hasMedia: boolean) => (
    <div className="talk-edit">
      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={1000} rows={3} autoFocus aria-label="Изменить сообщение" className="hb-input talk-edit-input"
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(hasMedia); } }} />
      <div className="talk-edit-actions">
        <button type="button" className="hx-cancel" onClick={() => setEditing(null)}>Отмена</button>
        <button type="button" className="hb-submit" onClick={() => saveEdit(hasMedia)} disabled={!editText.trim() && !hasMedia}>Сохранить</button>
      </div>
    </div>
  );

  const photo = (path: string | null | undefined) =>
    path && urls[path] ? <ViewableImage src={urls[path]} alt="Фото из разговора" className="talk-img-link" imgClassName="talk-img" /> : null;

  const renderThread = (t: TalkThread) => {
    const kindInfo = KINDS.find((k) => k.id === t.kind)!;
    const replies = repliesOf(t.id);
    const mine = t.author_id === profile.id;
    const waiting = !t.resolved && replies.length === 0;
    return (
      <li key={t.id} className={cn("rounded-card bg-paper p-4 shadow-soft ring-1 sm:p-5", waiting && !mine ? "ring-2 ring-accent-600" : "ring-sand-200")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-sm font-semibold text-accent-700"><kindInfo.icon className="size-4" aria-hidden />{kindInfo.label}</span>
          <span className="text-xs text-ink-faint">{nameOf(t.author_id)} · {when(t.created_at)}{t.edited_at ? " · изменено" : ""}</span>
        </div>
        {editing?.kind === "thread" && editing.id === t.id ? editor(Boolean(t.media_path)) : !(t.media_path && t.body === PHOTO_TEXT) && <p className="mt-3 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{t.body}</p>}
        {photo(t.media_path)}
        <p className="mt-2 text-xs font-semibold">
          {t.resolved ? <span className="text-success">Решено ✓</span> : waiting ? <span className={mine ? "text-ink-faint" : "text-accent-700"}>{mine ? `Ждёт ответа от ${partnerName}` : "Ждёт вашего ответа"}</span> : <span className="text-ink-faint">Идёт разговор</span>}
        </p>

        {replies.length > 0 && (
          <ul className="mt-3 space-y-2 border-l-2 border-sand-200 pl-3">
            {replies.map((r) => (
              <li key={r.id} className={cn("max-w-[92%] rounded-2xl px-3.5 py-2 text-sm", r.author_id === profile.id ? "ml-auto bg-accent-100 text-ink" : "bg-sand-100 text-ink")}>
                {editing?.kind === "reply" && editing.id === r.id ? editor(Boolean(r.media_path)) : !(r.media_path && r.body === PHOTO_TEXT) && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{r.body}</p>}
                {photo(r.media_path)}
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                  <span>{nameOf(r.author_id)} · {when(r.created_at)}{r.edited_at ? " · изменено" : ""}</span>
                  {r.author_id === profile.id && !(editing?.kind === "reply" && editing.id === r.id) && (
                    <button type="button" onClick={() => startEdit("reply", r.id, r.body)} aria-label="Изменить ответ" title="Изменить" className="talk-edit-btn"><Pencil size={12} aria-hidden /></button>
                  )}
                </p>
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
            {replyMedia[t.id] && (
              <div className="talk-attach"><img src={replyMedia[t.id].preview} alt="Выбранное фото" /><button type="button" aria-label="Убрать фото" onClick={() => { URL.revokeObjectURL(replyMedia[t.id].preview); setReplyMedia((m) => { const next = { ...m }; delete next[t.id]; return next; }); }}><X size={14} /></button></div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => choose(t.id)} aria-label="Прикрепить фото" className="talk-attach-btn icon"><ImagePlus size={17} aria-hidden="true" /></button>
              <input value={drafts[t.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(t.id, drafts[t.id] ?? ""); } }} maxLength={1000} placeholder="Ответить…" aria-label="Ответ" className="hb-input flex-1" />
              <button type="button" onClick={() => send(t.id, drafts[t.id] ?? "")} disabled={!(drafts[t.id] ?? "").trim() && !replyMedia[t.id]} aria-label="Отправить ответ" className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-accent-600 text-on-accent disabled:opacity-50"><Send className="size-4" aria-hidden /></button>
            </div>
          </div>
        )}

        {mine && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-sand-100 pt-3 text-sm">
            <button type="button" onClick={() => startEdit("thread", t.id, t.body)} className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-ink"><Pencil className="size-4" aria-hidden />Изменить</button>
            <button type="button" onClick={() => void run(() => setResolved(t.id, !t.resolved))} className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-ink">
              {t.resolved ? <><RotateCcw className="size-4" aria-hidden />Открыть снова</> : <><CheckCircle2 className="size-4" aria-hidden />Отметить решённым</>}
            </button>
            <button type="button" onClick={() => { if (window.confirm("Удалить это обращение вместе с ответами?")) void run(() => deleteThread(t.id, [t.media_path, ...repliesOf(t.id).map((r) => r.media_path)].filter((p): p is string => Boolean(p)))); }} className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-danger"><Trash2 className="size-4" aria-hidden />Удалить</button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => void onPick(e)} tabIndex={-1} aria-hidden="true" />
      <PageHeader title="Разговоры" description="Место, где можно спокойно рассказать об обиде, сказать, спросить или предложить. Партнёр ответит, когда будет готов." />

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
        {attachment && (
          <div className="talk-attach"><img src={attachment.preview} alt="Выбранное фото" /><button type="button" aria-label="Убрать фото" onClick={() => { URL.revokeObjectURL(attachment.preview); setAttachment(null); }}><X size={14} /></button></div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => choose("new")} className="talk-attach-btn"><ImagePlus size={16} aria-hidden="true" /> Фото</button>
            <p className="text-xs text-ink-faint">{body.trim().length} / 1000</p>
          </div>
          <button disabled={(!body.trim() && !attachment) || busy} className="hb-submit mt-0! w-auto! px-6"><Send className="mr-1.5 inline size-4" aria-hidden />Отправить</button>
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
