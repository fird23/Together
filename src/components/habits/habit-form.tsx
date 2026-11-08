"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EVENT_COLORS } from "@/utils/calendar";
import { HABIT_ICONS } from "@/utils/habit-icons";
import { WEEKDAY_SHORT, scheduleKind, type ScheduleKind } from "@/utils/habit-stats";
import { cn } from "@/utils/cn";
import type { EventColor } from "@/types";

export type HabitLike = {
  title: string;
  scope: "shared" | "personal";
  color?: EventColor | null;
  icon?: string | null;
  week_days?: number[] | null;
  per_week?: number | null;
};

export type HabitDraft = {
  title: string;
  scope: "shared" | "personal";
  color: EventColor | null;
  icon: string | null;
  mode: ScheduleKind;
  days: number[];
  perWeek: number;
};

export const emptyDraft = (): HabitDraft => ({ title: "", scope: "shared", color: null, icon: null, mode: "daily", days: [], perWeek: 3 });
export const draftFromHabit = (h: HabitLike): HabitDraft => ({
  title: h.title, scope: h.scope, color: h.color ?? null, icon: h.icon ?? null,
  mode: scheduleKind(h), days: h.week_days ?? [], perWeek: h.per_week ?? 3,
});

/** Колонки базы для расписания из черновика. */
export const scheduleColumns = (d: HabitDraft) => ({
  week_days: d.mode === "days" ? [...d.days].sort((a, b) => a - b) : null,
  per_week: d.mode === "count" ? d.perWeek : null,
});

export const validateDraft = (d: HabitDraft): string | null =>
  !d.title.trim() ? "Напишите название привычки." : d.mode === "days" && d.days.length === 0 ? "Выберите хотя бы один день недели." : null;

/** Цвет, иконка и расписание привычки. Используется и при создании, и при изменении. */
export function HabitStyleFields({ draft, onChange, disabled }: { draft: HabitDraft; onChange: (patch: Partial<HabitDraft>) => void; disabled?: boolean }) {
  const toggleDay = (day: number) => onChange({ days: draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day] });
  return (
    <div className="hf-fields">
      <fieldset disabled={disabled}>
        <legend>Цвет</legend>
        <div className="hf-colors" role="radiogroup" aria-label="Цвет привычки">
          <button type="button" role="radio" aria-checked={draft.color === null} className={cn("hf-swatch none", draft.color === null && "on")} onClick={() => onChange({ color: null })} title="По умолчанию (цвет темы)"><Check size={13} aria-hidden="true" /></button>
          {EVENT_COLORS.map((c) => (
            <button type="button" key={c.id} role="radio" aria-checked={draft.color === c.id} className={cn("hf-swatch", draft.color === c.id && "on")} style={{ background: c.hex }} onClick={() => onChange({ color: c.id })} title={c.label}>
              {draft.color === c.id && <Check size={13} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend>Иконка</legend>
        <div className="hf-icons" role="radiogroup" aria-label="Иконка привычки">
          {HABIT_ICONS.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} role="radio" aria-checked={(draft.icon ?? "sparkles") === id} className={cn("hf-icon", (draft.icon ?? "sparkles") === id && "on")} onClick={() => onChange({ icon: id })} title={label} aria-label={label}>
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend>Как часто</legend>
        <div className="hb-segment" role="radiogroup" aria-label="Расписание">
          {([["daily", "Каждый день"], ["days", "По дням"], ["count", "N в неделю"]] as [ScheduleKind, string][]).map(([id, label]) => (
            <button type="button" key={id} role="radio" aria-checked={draft.mode === id} className={draft.mode === id ? "active" : ""} onClick={() => onChange({ mode: id })}>{label}</button>
          ))}
        </div>
        {draft.mode === "days" && (
          <div className="hf-days" role="group" aria-label="Дни недели">
            {WEEKDAY_SHORT.map((label, i) => <button type="button" key={label} aria-pressed={draft.days.includes(i + 1)} className={draft.days.includes(i + 1) ? "on" : ""} onClick={() => toggleDay(i + 1)}>{label}</button>)}
          </div>
        )}
        {draft.mode === "count" && (
          <label className="hf-count">Сколько дней в неделю
            <select value={draft.perWeek} onChange={(e) => onChange({ perWeek: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <p className="hb-muted hb-caption">
          {draft.mode === "daily" ? "Привычка ждёт отметки каждый день." : draft.mode === "days" ? "В остальные дни пропуск серию не прервёт." : "Не важно, в какие дни: серия считается неделями, в которых выполнена норма."}
        </p>
      </fieldset>
    </div>
  );
}

/** Окно изменения привычки: название, цвет, иконка и расписание. */
export function HabitEditModal({ habit, onClose, onSave }: { habit: HabitLike | null; onClose: () => void; onSave: (draft: HabitDraft) => Promise<void> }) {
  return (
    <Modal open={habit !== null} onClose={onClose} title="Изменить привычку">
      {habit && <EditBody habit={habit} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function EditBody({ habit, onClose, onSave }: { habit: HabitLike; onClose: () => void; onSave: (d: HabitDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<HabitDraft>(() => draftFromHabit(habit));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validateDraft(draft);
    if (problem) return setError(problem);
    setPending(true); setError("");
    try { await onSave(draft); onClose(); } catch { setError("Не удалось сохранить привычку."); setPending(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={70} aria-label="Название привычки" className="hb-input" autoFocus />
      <HabitStyleFields draft={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} disabled={pending} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={pending}>Отмена</Button>
        <Button type="submit" loading={pending}>Сохранить</Button>
      </div>
    </form>
  );
}
