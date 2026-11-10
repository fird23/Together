"use client";

import { useState } from "react";
import { Check, Loader2, Target } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { parseAmount } from "@/components/habits/habit-form";
import { HabitIcon } from "@/utils/habit-icons";
import { colorHex } from "@/utils/calendar";
import type { EventColor } from "@/types";

type Target = { id: string; title: string; icon?: string | null; color?: EventColor | null; target_value: number; unit?: string | null };

export const fmtAmount = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);

/** Шаг быстрых кнопок: подбирается от нормы, чтобы до неё хватало примерно 6 нажатий. */
function niceStep(target: number): number {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  return [...steps].reverse().find((s) => s <= target / 6) ?? steps[0];
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ввод числа за день для привычки с нормой: впишите, сколько сделано. Норма достигнута или превышена, и день отмечается сам. */
export function HabitProgressModal({ habit, dayLabel, current, onClose, onSave }: {
  habit: Target | null; dayLabel: string; current: number; onClose: () => void; onSave: (value: number) => Promise<void>;
}) {
  return (
    <Modal open={habit !== null} onClose={onClose} title={habit?.title ?? ""}>
      {habit && <Body key={`${habit.id}:${dayLabel}`} habit={habit} dayLabel={dayLabel} current={current} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Body({ habit, dayLabel, current, onClose, onSave }: { habit: Target; dayLabel: string; current: number; onClose: () => void; onSave: (v: number) => Promise<void> }) {
  const [text, setText] = useState(current > 0 ? String(current) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const target = Number(habit.target_value);
  const unit = habit.unit ?? "";
  const value = parseAmount(text);
  const step = niceStep(target);
  const pct = Math.min(100, Math.round((value / target) * 100));
  const reached = value >= target;
  const hue = habit.color ? colorHex(habit.color) : undefined;

  const add = (n: number) => setText(String(round2(value + n)));

  async function save(v: number) {
    setPending(true); setError("");
    try { await onSave(v); onClose(); }
    catch { setError("Не удалось сохранить. Проверьте, что применена миграция 023_habit_targets_and_moods.sql."); setPending(false); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(value); }} className="hp-form" style={hue ? ({ "--hc": hue } as React.CSSProperties) : undefined}>
      <p className="hp-day">{dayLabel}</p>
      <div className="hp-head">
        <span className="hx-icon big" aria-hidden="true"><HabitIcon id={habit.icon} size={24} /></span>
        <div className="hp-goal"><span><Target size={13} aria-hidden /> Норма на день</span><b>{fmtAmount(target)} {unit}</b></div>
      </div>

      <div className="hp-input">
        <input value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" placeholder="0" maxLength={10} autoFocus aria-label={`Сколько сделано${unit ? `, ${unit}` : ""}`} />
        {unit && <span>{unit}</span>}
      </div>

      <div className="hp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i className={reached ? "full" : ""} style={{ width: `${pct}%` }} /></div>
      <p className={`hp-state ${reached ? "ok" : ""}`}>
        {reached ? <><Check size={15} aria-hidden /> Норма выполнена{value > target ? `, больше на ${fmtAmount(round2(value - target))} ${unit}` : ""}</> : value > 0 ? `Осталось ${fmtAmount(round2(target - value))} ${unit}` : "Впишите, сколько уже сделано"}
      </p>

      <div className="hp-chips" role="group" aria-label="Быстро добавить">
        <button type="button" onClick={() => add(step)}>+{fmtAmount(step)}</button>
        <button type="button" onClick={() => add(step * 2)}>+{fmtAmount(round2(step * 2))}</button>
        <button type="button" onClick={() => setText(String(target))}>Вся норма</button>
        {value > 0 && <button type="button" className="ghost" onClick={() => setText("")}>Сбросить</button>}
      </div>

      {error && <p role="alert" className="hp-error">{error}</p>}
      <div className="hp-actions">
        <button type="button" className="hx-cancel" onClick={onClose} disabled={pending}>Отмена</button>
        <button type="submit" className="hb-submit" disabled={pending}>{pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}{pending ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </form>
  );
}
