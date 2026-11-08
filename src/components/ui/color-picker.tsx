"use client";

import { Check } from "lucide-react";
import { EVENT_COLORS } from "@/utils/calendar";
import { cn } from "@/utils/cn";
import type { EventColor } from "@/types";

/** Ряд цветов: первый кружок — «без цвета». */
export function ColorPicker({ value, onChange, label = "Цвет" }: { value: EventColor | null; onChange: (color: EventColor | null) => void; label?: string }) {
  return (
    <div className="hf-colors" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={value === null} className={cn("hf-swatch none", value === null && "on")} onClick={() => onChange(null)} title="Без цвета"><Check size={13} aria-hidden="true" /></button>
      {EVENT_COLORS.map((c) => (
        <button type="button" key={c.id} role="radio" aria-checked={value === c.id} className={cn("hf-swatch", value === c.id && "on")} style={{ background: c.hex }} onClick={() => onChange(c.id)} title={c.label}>
          {value === c.id && <Check size={13} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
