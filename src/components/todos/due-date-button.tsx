"use client";

import { useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import { addDays, todayISO } from "@/utils/days";
import { cn } from "@/utils/cn";

const label = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Кнопка «Срок»: по нажатию открывается календарь, рядом быстрые варианты «Сегодня» и «Завтра». */
export function DueDateButton({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const today = todayISO();

  function open() {
    const el = input.current;
    if (!el) return;
    try { if (el.showPicker) { el.showPicker(); return; } } catch { /* старые браузеры: откроем обычным способом */ }
    el.focus(); el.click();
  }

  return (
    <div className="due-wrap">
      <button type="button" onClick={open} className={cn("due-btn", value && "has")} aria-label={value ? `Срок: ${label(value)}. Изменить` : "Выбрать срок"}>
        <CalendarDays size={15} aria-hidden="true" /> {value ? label(value) : "Срок"}
      </button>
      {value ? (
        <button type="button" className="due-clear" onClick={() => onChange("")} aria-label="Убрать срок"><X size={14} /></button>
      ) : (
        <>
          <button type="button" className="due-chip" onClick={() => onChange(today)}>Сегодня</button>
          <button type="button" className="due-chip" onClick={() => onChange(addDays(today, 1))}>Завтра</button>
        </>
      )}
      <input ref={input} type="date" value={value} min={today} onChange={(e) => onChange(e.target.value)} className="due-input" tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
