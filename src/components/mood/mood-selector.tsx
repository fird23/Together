"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Heart, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";

type Mood = { id: string; user_id: string; mood: string; note: string | null; day: string };
const choices = [
  { value: "great", emoji: "🤩", label: "Прекрасно", color: "#FCE9C9" },
  { value: "good", emoji: "😊", label: "Хорошо", color: "#E6F1DF" },
  { value: "calm", emoji: "😌", label: "Спокойно", color: "#E7ECF8" },
  { value: "tired", emoji: "😴", label: "Устал(а)", color: "#F0EAF8" },
  { value: "sad", emoji: "🥺", label: "Грустно", color: "#F9E8EC" },
  { value: "stressed", emoji: "😵‍💫", label: "Тревожно", color: "#F8EBDf" },
];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

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
    const { data, error: queryError } = await supabase.from("mood_entries").select("id,user_id,mood,note,day").eq("couple_id", couple.id).eq("day", today);
    if (queryError) { setError("Не удалось загрузить настроение. Примените SQL-миграцию 005_mood.sql."); return; }
    const list = (data ?? []) as Mood[]; setRows(list);
    const mine = list.find((r) => r.user_id === profile.id); setSelected(mine?.mood ?? ""); setNote(mine?.note ?? "");
  }, [couple, profile, today]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (!supabase || !couple || !profile || !selected) return;
    setSaving(true); setError("");
    const { error: saveError } = await supabase.from("mood_entries").upsert({ couple_id: couple.id, user_id: profile.id, day: today, mood: selected, note: note.trim() || null }, { onConflict: "couple_id,user_id,day" });
    if (saveError) setError("Не удалось сохранить отметку. Проверьте миграцию базы данных."); else await load();
    setSaving(false);
  };
  const personMood = (id?: string) => rows.find((r) => r.user_id === id);
  const myMood = personMood(profile?.id); const partnerMood = personMood(partner?.id);
  const renderPerson = (name: string, entry?: Mood) => {
    const choice = choices.find((c) => c.value === entry?.mood);
    return <div className="mood-person"><span className="mood-face">{choice?.emoji ?? "💭"}</span><span><strong>{name}</strong><small>{choice?.label ?? "Ещё не выбрано"}</small>{entry?.note && <small className="mood-person-note">{entry.note}</small>}</span></div>;
  };
  return <section className={`dashboard-card mood-selector-card ${compact ? "mood-selector-compact" : ""}`}>
    <div className="mood-pair">{renderPerson("Вы", myMood)}{renderPerson(partner?.display_name ?? "Партнёр", partnerMood)}</div>
    <div className="mt-4"><p className="mb-2 text-sm font-semibold">Ваше настроение сегодня</p>
      <div className="mood-choice-grid">{choices.map((choice) => <button type="button" key={choice.value} onClick={() => setSelected(choice.value)} aria-label={choice.label} title={choice.label} aria-pressed={selected===choice.value} className={`mood-choice mood-emoji-only ${selected===choice.value?"is-selected":""}`}><span style={{background:choice.color}}>{choice.emoji}</span>{selected===choice.value&&<Check size={12}/>}</button>)}</div>
    </div>
    <div className="mood-note-action-row">
      <label className="sr-only" htmlFor="mood-note">Комментарий к настроению</label>
      <textarea id="mood-note" value={note} onChange={(e)=>setNote(e.target.value)} maxLength={240} rows={1} placeholder="Добавить комментарий…" className="mood-note-input" />
      <button type="button" onClick={()=>void save()} disabled={!selected||saving} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-on-accent hover:bg-accent-700 disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Check size={16}/>}Сохранить</button>
    </div>
    {error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <p className="mt-2 text-xs text-ink-faint"><Heart size={12} className="mr-1 inline"/> Отметка видна вам обоим</p>
  </section>;
}
