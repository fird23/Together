"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Check, Heart } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { listGratitude, saveGratitude } from "@/services/gratitude";
import { todayISO } from "@/utils/days";
import type { GratitudeNote } from "@/types";

const dayLabel = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Одна строка в день: «за что я благодарен(на) сегодня». Партнёр видит её сразу, а прошлые записи копятся в банке. */
export function GratitudeCard() {
  const { couple, profile, partner } = useWorkspace();
  const [notes, setNotes] = useState<GratitudeNote[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [jar, setJar] = useState(false);
  const [error, setError] = useState("");
  const filled = useRef(false);
  const today = todayISO();

  const load = useCallback(async () => {
    if (!couple || !profile) return;
    try {
      const list = await listGratitude(couple.id);
      setNotes(list);
      if (!filled.current) { // подставляем сегодняшнюю запись один раз, чтобы не затирать набираемый текст
        filled.current = true;
        setText(list.find((n) => n.user_id === profile.id && n.day === today)?.text ?? "");
      }
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
  }, [couple, profile, today]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("gratitude_notes", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  if (!couple || !profile) return null;
  const partnerName = partner?.display_name ?? "Партнёр";
  const mine = notes.find((n) => n.user_id === profile.id && n.day === today);
  const theirs = partner ? notes.find((n) => n.user_id === partner.id && n.day === today) : undefined;
  const unchanged = Boolean(mine) && mine!.text === text.trim();
  const past = notes.filter((n) => n.day !== today);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || !couple || !profile) return;
    setSaving(true); setError("");
    try { await saveGratitude(couple.id, profile.id, today, text); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setSaving(false);
  }

  return (
    <section className="dashboard-card gratitude-card">
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={submit}>
          <label htmlFor="gratitude-text" className="mb-2 block text-sm font-semibold">Я благодарен(на) за…</label>
          <div className="flex gap-2">
            <input id="gratitude-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Например, за вкусный завтрак" className="hb-input flex-1" />
            <button disabled={!text.trim() || saving || unchanged} className="mood-save">{unchanged ? <><Check size={15} /> Сохранено</> : "Сохранить"}</button>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Одна запись в день. Партнёр увидит её сразу.</p>
        </form>
        <div className="rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-100">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-700"><Heart className="size-3.5" fill="currentColor" aria-hidden />{partnerName} благодарит</p>
          <p className="[overflow-wrap:anywhere] leading-relaxed">{theirs ? theirs.text : <span className="text-ink-faint">Сегодня пока нет записи.</span>}</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <button type="button" onClick={() => setJar((v) => !v)} aria-expanded={jar} className="mt-4 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
        {jar ? "Скрыть банку благодарности" : `Банка благодарности · ${past.length + (mine ? 1 : 0) + (theirs ? 1 : 0)}`}
      </button>
      {jar && (
        past.length === 0 ? (
          <div className="mt-3 flex flex-col items-center text-center text-sm text-ink-faint"><Illustration kind="gratitude" /><p>Прошлых записей пока нет. Завтра здесь появится первая.</p></div>
        ) : (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {past.map((n) => (
              <li key={n.id} className="rounded-xl bg-milk px-3.5 py-2.5 text-sm">
                <p className="[overflow-wrap:anywhere]">{n.text}</p>
                <p className="mt-0.5 text-xs text-ink-faint">{n.user_id === profile.id ? "Вы" : partnerName} · {dayLabel(n.day)}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
