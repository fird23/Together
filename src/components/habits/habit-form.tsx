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
  /** Числовая норма на день (5000 шагов); пусто — обычная привычка с галочкой. */
  target_value?: number | null;
  unit?: string | null;
};

export type HabitDraft = {
  title: string;
  scope: "shared" | "personal";
  color: EventColor | null;
  icon: string | null;
  mode: ScheduleKind;
  days: number[];
  perWeek: number;
  /** «check» — просто отметить, «number» — вписать число и достичь нормы. */
  kind: "check" | "number";
  target: string;
  unit: string;
};

export const emptyDraft = (): HabitDraft => ({ title: "", scope: "shared", color: null, icon: null, mode: "daily", days: [], perWeek: 3, kind: "check", target: "", unit: "" });
export const draftFromHabit = (h: HabitLike): HabitDraft => ({
  title: h.title, scope: h.scope, color: h.color ?? null, icon: h.icon ?? null,
  mode: scheduleKind(h), days: h.week_days ?? [], perWeek: h.per_week ?? 3,
  kind: h.target_value ? "number" : "check", target: h.target_value ? String(Number(h.target_value)) : "", unit: h.unit ?? "",
});

/** Число из поля ввода: допускает запятую и пробелы («5 000», «1,5»). */
export const parseAmount = (raw: string): number => {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Колонки базы для числовой нормы из черновика. */
export const targetColumns = (d: HabitDraft) => ({
  target_value: d.kind === "number" ? parseAmount(d.target) : null,
  unit: d.kind === "number" ? d.unit.trim() || null : null,
});

/** Колонки базы для расписания из черновика. */
export const scheduleColumns = (d: HabitDraft) => ({
  week_days: d.mode === "days" ? [...d.days].sort((a, b) => a - b) : null,
  per_week: d.mode === "count" ? d.perWeek : null,
});

export const validateDraft = (d: HabitDraft): string | null =>
  !d.title.trim() ? "Напишите название привычки."
    : d.mode === "days" && d.days.length === 0 ? "Выберите хотя бы один день недели."
    : d.kind === "number" && !(parseAmount(d.target) > 0 && parseAmount(d.target) <= 1_000_000) ? "Укажите норму на день: число больше нуля, например 5000."
    : null;

const UNIT_PRESETS = ["шагов", "км", "л", "мл", "мин", "раз", "стр."];

/** Цвет, иконка и расписание привычки. Используется и при создании, и при изменении. */
export function HabitStyleFields({ draft, onChange, disabled }: { draft: HabitDraft; onChange: (patch: Partial<HabitDraft>) => void; disabled?: boolean }) {
  const toggleDay = (day: number) => onChange({ days: draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day] });
  return (
    <div className="hf-fields">
      <fieldset disabled={disabled}>
        <legend>Как отмечать</legend>
        <div className="hb-segment" role="radiogroup" aria-label="Способ отметки">
          <button type="button" role="radio" aria-checked={draft.kind === "check"} className={draft.kind === "check" ? "active" : ""} onClick={() => onChange({ kind: "check" })}>Галочка</button>
          <button type="button" role="radio" aria-checked={draft.kind === "number"} className={draft.kind === "number" ? "active" : ""} onClick={() => onChange({ kind: "number" })}>Число</button>
        </div>
        {draft.kind === "number" && (
          <div className="hf-number">
            <div className="hf-number-row">
              <label>Норма на день
                <input value={draft.target} onChange={(e) => onChange({ target: e.target.value })} inputMode="decimal" placeholder="5000" maxLength={9} aria-label="Норма на день" />
              </label>
              <label>Единица
                <input value={draft.unit} onChange={(e) => onChange({ unit: e.target.value })} placeholder="шагов" maxLength={16} aria-label="Единица измерения" />
              </label>
            </div>
            <div className="hf-units" role="group" aria-label="Частые единицы">
              {UNIT_PRESETS.map((u) => <button type="button" key={u} className={draft.unit === u ? "on" : ""} onClick={() => onChange({ unit: u })}>{u}</button>)}
            </div>
          </div>
        )}
        <p className="hb-muted hb-caption">
          {draft.kind === "number" ? "Впишите, сколько сделано. Когда число достигнет нормы или станет больше, привычка отметится сама." : "Обычная отметка: выполнено или нет."}
        </p>
      </fieldset>

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
    try { await onSave(draft); onClose(); } catch { setError(draft.kind === "number" ? "Не удалось сохранить. Для привычек с числом нужна миграция 023_habit_targets_and_moods.sql." : "Не удалось сохранить привычку. Попробуйте ещё раз."); setPending(false); }
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
