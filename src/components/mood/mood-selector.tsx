"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { MOOD_GROUPS, defaultMood, moodOf, moodsOfGroup, type MoodGroup } from "@/lib/moods";
import { MoodIcon } from "@/components/mood/mood-icons";
import { useRealtime } from "@/hooks/use-realtime";

type Mood = { id: string; user_id: string; mood: string; note: string | null; day: string };

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hueStyle = (hue: string) => ({ "--mood-hue": hue }) as CSSProperties;
const HOLD_MS = 420;

export function MoodSelector({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [rows, setRows] = useState<Mood[]>([]);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /** Группа, у которой сейчас открыта лента эмоций. */
  const [openGroup, setOpenGroup] = useState<MoodGroup | null>(null);
  const hold = useRef<{ timer: number; fired: boolean } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
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

  // Лента закрывается по Esc и по нажатию вне блока выбора.
  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenGroup(null); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpenGroup(null); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [openGroup]);

  // При открытии ленты показываем выбранную эмоцию.
  useEffect(() => {
    if (!openGroup) return;
    const el = strip.current?.querySelector<HTMLElement>("[aria-selected='true']");
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [openGroup]);

  const save = async () => {
    if (!supabase || !couple || !profile || !selected) return;
    setSaving(true); setError("");
    const { error: saveError } = await supabase
      .from("mood_entries")
      .upsert(
        { couple_id: couple.id, user_id: profile.id, day: today, mood: selected, note: note.trim() || null },
        { onConflict: "couple_id,user_id,day" },
      );
    if (saveError) setError("Не удалось сохранить отметку. Если выбрана новая эмоция, примените миграцию 033_mood_catalog.sql.");
    else await load();
    setSaving(false);
  };

  const entryOf = (id?: string) => rows.find((r) => r.user_id === id);
  const myEntry = entryOf(profile?.id);
  const unchanged = !!myEntry && myEntry.mood === selected && (myEntry.note ?? "") === note.trim();
  const selectedDef = moodOf(selected);

  // --- Кнопка группы: нажатие ставит вариант по умолчанию, зажатие (или правый клик) открывает ленту ---
  function startHold(e: ReactPointerEvent, group: MoodGroup) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (hold.current) window.clearTimeout(hold.current.timer);
    const state = { fired: false, timer: 0 };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      setOpenGroup(group);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
    }, HOLD_MS);
    hold.current = state;
  }
  const cancelHold = () => { if (hold.current) window.clearTimeout(hold.current.timer); };
  function tapGroup(group: MoodGroup) {
    if (hold.current?.fired) { hold.current.fired = false; return; } // это было удержание, а не нажатие
    const current = moodOf(selected);
    if (current?.group === group) { setOpenGroup(openGroup === group ? null : group); return; } // повторное нажатие: выбрать точнее
    setSelected(defaultMood(group).id);
    setOpenGroup(null);
  }
  const pick = (id: string) => { setSelected(id); setOpenGroup(null); };

  const renderPerson = (name: string, entry?: Mood) => {
    const choice = moodOf(entry?.mood);
    return (
      <div className={`mood-person ${choice ? "has-mood" : ""}`} style={choice ? hueStyle(choice.hue) : undefined}>
        <span className="mood-face" aria-hidden="true">{choice ? <MoodIcon mood={choice.id} size={30} /> : <span className="mood-face-empty">?</span>}</span>
        <span className="mood-person-copy">
          <small className="mood-person-name">{name}</small>
          <strong>{choice?.label ?? (entry?.mood ? entry.mood : "Ещё не выбрано")}</strong>
          {entry?.note && <em title={entry.note}>{entry.note}</em>}
        </span>
      </div>
    );
  };

  return (
    <section ref={root} className={`dashboard-card mood-selector-card ${compact ? "mood-selector-compact" : ""}`}>
      <div className="mood-pair">
        {renderPerson("Вы", myEntry)}
        {renderPerson(partner?.display_name ?? "Партнёр", entryOf(partner?.id))}
      </div>

      <p className="mood-question">Как вы сегодня?</p>
      <div className="mg-groups" role="radiogroup" aria-label="Ваше настроение сегодня">
        {MOOD_GROUPS.map((group) => {
          const picked = selectedDef?.group === group.id ? selectedDef : null;
          const shown = picked ?? defaultMood(group.id);
          const open = openGroup === group.id;
          return (
            <div key={group.id} className="mg-group">
              <button
                type="button"
                role="radio"
                aria-checked={Boolean(picked)}
                aria-expanded={open}
                aria-label={`${group.label}${picked ? `: ${picked.label}` : ""}. Зажмите, чтобы выбрать точнее`}
                style={hueStyle(shown.hue)}
                className={`mg-btn mg-${group.id} ${picked ? "is-selected" : ""} ${open ? "is-open" : ""}`}
                onClick={() => tapGroup(group.id)}
                onPointerDown={(e) => startHold(e, group.id)}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onContextMenu={(e) => { e.preventDefault(); setOpenGroup(group.id); }}
                onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpenGroup(group.id); } }}
              >
                <span className="mg-face" aria-hidden="true"><MoodIcon mood={shown.id} size={38} /></span>
                <span className="mg-name">{group.label}</span>
                <span className="mg-value">{shown.label}</span>
                {picked && <Check size={14} className="mg-check" aria-hidden="true" />}
              </button>
              <button type="button" className="mg-more" onClick={() => setOpenGroup(open ? null : group.id)} aria-label={`Другие эмоции: ${group.label}`} aria-expanded={open}>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {openGroup && (
        <div ref={strip} className="mg-strip" role="listbox" aria-label={`Эмоции: ${MOOD_GROUPS.find((g) => g.id === openGroup)!.label}`}>
          {moodsOfGroup(openGroup).map((m) => (
            <button type="button" key={m.id} role="option" aria-selected={selected === m.id} style={hueStyle(m.hue)} className={`mg-item ${selected === m.id ? "is-selected" : ""}`} onClick={() => pick(m.id)}>
              <MoodIcon mood={m.id} size={38} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mg-hint"><span className="mg-hint-touch">Нажмите: вариант по умолчанию. Зажмите кнопку: выбрать точнее.</span><span className="mg-hint-mouse">Нажмите: вариант по умолчанию. Стрелка или правый клик: выбрать точнее.</span></p>

      <div className="mood-note-action-row">
        <label className="sr-only" htmlFor="mood-note">Комментарий к настроению</label>
        <textarea
          id="mood-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={240}
          rows={1}
          placeholder="Комментарий…"
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
