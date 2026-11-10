"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAY_SHORT, weekStart } from "@/utils/habit-stats";
import { addDays } from "@/utils/days";

const dayNum = (iso: string) => String(Number(iso.slice(8, 10)));

/** Неделя по дням: кольцо показывает, сколько привычек отмечено в этот день. Нажмите на день, чтобы увидеть или поправить его отметки. */
export function HabitWeekStrip({ today, selected, onSelect, weekOffset, onWeekOffset, progress }: {
  today: string; selected: string; onSelect: (iso: string) => void;
  weekOffset: number; onWeekOffset: (n: number) => void;
  progress: (iso: string) => { done: number; total: number };
}) {
  const start = addDays(weekStart(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const r = 15, circ = 2 * Math.PI * r;
  return (
    <div className="hx-strip">
      <button type="button" className="hx-strip-nav" onClick={() => onWeekOffset(weekOffset - 1)} aria-label="Предыдущая неделя"><ChevronLeft size={16} /></button>
      <ol>
        {days.map((iso, i) => {
          const { done, total } = progress(iso);
          const future = iso > today;
          const full = total > 0 && done === total;
          return (
            <li key={iso}>
              <button type="button" disabled={future} aria-pressed={selected === iso} onClick={() => onSelect(iso)}
                className={`hx-day ${selected === iso ? "sel" : ""} ${iso === today ? "today" : ""} ${full ? "full" : ""}`}
                aria-label={`${WEEKDAY_SHORT[i]} ${dayNum(iso)}${total ? `: ${done} из ${total}` : ""}`}>
                <small>{WEEKDAY_SHORT[i]}</small>
                <span className="hx-day-ring">
                  <svg viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r={r} className="bg" />
                    {total > 0 && !future && <circle cx="18" cy="18" r={r} className="fg" strokeDasharray={circ} strokeDashoffset={circ * (1 - done / total)} transform="rotate(-90 18 18)" />}
                  </svg>
                  <b>{dayNum(iso)}</b>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" className="hx-strip-nav" onClick={() => onWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0} aria-label="Следующая неделя"><ChevronRight size={16} /></button>
    </div>
  );
}
