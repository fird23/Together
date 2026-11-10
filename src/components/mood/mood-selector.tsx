"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Check, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { MoodIcon } from "@/components/mood/mood-icons";
import { useRealtime } from "@/hooks/use-realtime";

type Mood = { id: string; user_id: string; mood: string; note: string | null; day: string };

/** hue — акцентный цвет настроения; фоны подмешиваются к теме, поэтому блок одинаково хорош в светлом и тёмном режиме. */
const choices = [
  { value: "great", label: "Прекрасно", hue: "#E9A93B" },
  { value: "angry", label: "Злой", hue: "#D8584E" },
  { value: "calm", label: "Спокойно", hue: "#6C8FD6" },
  { value: "tired", label: "Без сил", hue: "#9A82C9" },
  { value: "sad", label: "Грустно", hue: "#D9708E" },
  { value: "stressed", label: "Тревожно", hue: "#D98B5B" },
  { value: "love", label: "Влюблён", hue: "#E5648A" },
  { value: "miss", label: "Скучаю", hue: "#B36BC9" },
  { value: "playful", label: "Игривый", hue: "#4FB0A5" },
];

/** Старые записи с «Хорошо» остаются в истории и показываются как раньше, но выбрать это настроение уже нельзя. */
const legacy = [{ value: "good", label: "Хорошо", hue: "#6FAE6B" }];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hueStyle = (hue: string) => ({ "--mood-hue": hue }) as CSSProperties;

export function MoodSelector({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [rows, setRows] = useState<Mood[]>([]);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const today = todayISO();

  const load = useCallback(async () => {
    if (!supabase || !couple || !profile) return;
    const { data, error: queryError } = await supabase
      .from("mood_entries")
      .select("id,user_id,mood,note,day")
      .eq("couple_id", couple.id)
      .eq("day", today);
    if (queryError) { setError("Не удалось загрузить настроение. Примените SQL-миграцию 005_mood.sql."); return; }
    const list = (data ?? []) as Mood[];
    setRows(list);
    const mine = list.find((r) => r.user_id === profile.id);
    setSelected(mine?.mood ?? "");
    setNote(mine?.note ?? "");
  }, [couple, profile, today]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("mood_entries", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  const save = async () => {
    if (!supabase || !couple || !profile || !selected) return;
    setSaving(true); setError("");
    const { error: saveError } = await supabase
      .from("mood_entries")
      .upsert(
        { couple_id: couple.id, user_id: profile.id, day: today, mood: selected, note: note.trim() || null },
        { onConflict: "couple_id,user_id,day" },
      );
    if (saveError) setError("Не удалось сохранить отметку. Проверьте миграцию базы данных.");
    else await load();
    setSaving(false);
  };

  const entryOf = (id?: string) => rows.find((r) => r.user_id === id);
  const myEntry = entryOf(profile?.id);
  const unchanged = !!myEntry && myEntry.mood === selected && (myEntry.note ?? "") === note.trim();

  const renderPerson = (name: string, entry?: Mood) => {
    const choice = [...choices, ...legacy].find((c) => c.value === entry?.mood);
    return (
      <div className={`mood-person ${choice ? "has-mood" : ""}`} style={choice ? hueStyle(choice.hue) : undefined}>
        <span className="mood-face" aria-hidden="true">{choice ? <MoodIcon mood={choice.value} size={30} /> : <span className="mood-face-empty">?</span>}</span>
        <span className="mood-person-copy">
          <small className="mood-person-name">{name}</small>
          <strong>{choice?.label ?? "Ещё не выбрано"}</strong>
          {entry?.note && <em title={entry.note}>{entry.note}</em>}
        </span>
      </div>
    );
  };

  return (
    <section className={`dashboard-card mood-selector-card ${compact ? "mood-selector-compact" : ""}`}>
      <div className="mood-pair">
        {renderPerson("Вы", myEntry)}
        {renderPerson(partner?.display_name ?? "Партнёр", entryOf(partner?.id))}
      </div>

      <p className="mood-question">Как вы сегодня?</p>
      <div className="mood-choice-grid" role="radiogroup" aria-label="Ваше настроение сегодня">
        {choices.map((choice) => {
          const active = selected === choice.value;
          return (
            <button
              type="button"
              key={choice.value}
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(choice.value)}
              style={hueStyle(choice.hue)}
              className={`mood-choice ${active ? "is-selected" : ""}`}
            >
              <span className="mood-choice-emoji" aria-hidden="true"><MoodIcon mood={choice.value} size={26} /></span>
              <span className="mood-choice-label">{choice.label}</span>
              {active && <Check size={13} className="mood-choice-check" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="mood-note-action-row">
        <label className="sr-only" htmlFor="mood-note">Комментарий к настроению</label>
        <textarea
          id="mood-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={240}
          rows={1}
          placeholder="Добавить комментарий…"
          className="mood-note-input"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!selected || saving || unchanged}
          className="mood-save"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {unchanged ? "Сохранено" : "Сохранить"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
