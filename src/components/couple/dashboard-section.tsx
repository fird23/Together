"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { cn } from "@/utils/cn";

/** Блок главной: заголовок, сворачивание и (в режиме настройки) перестановка стрелками или перетаскиванием. */
export function DashboardSection({
  id, eyebrow, title, hint, className, collapsed, editing, canUp, canDown, dragging, onToggle, onMove, onDragStart, onDragEnd, onDropOn, children,
}: {
  id: string; eyebrow: string; title: string; hint?: string; className?: string;
  collapsed: boolean; editing: boolean; canUp: boolean; canDown: boolean; dragging: boolean;
  onToggle: () => void; onMove: (dir: -1 | 1) => void; onDragStart: () => void; onDragEnd: () => void; onDropOn: () => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <section
      id={`block-${id}`}
      aria-labelledby={`block-${id}-title`}
      className={cn("dash-block", className, editing && "is-editing", over && "is-over", dragging && "is-dragging")}
      draggable={editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); onDragStart(); }}
      onDragEnd={() => { setOver(false); onDragEnd(); }}
      onDragOver={(e) => { if (editing) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropOn(); }}
    >
      <div className="dashboard-section-title">
        <div><p className="eyebrow">{eyebrow}</p><h2 id={`block-${id}-title`} className="font-serif">{title}</h2></div>
        <div className="dash-tools">
          {hint && !collapsed && !editing && <span className="dash-hint">{hint}</span>}
          {editing && (
            <>
              <span className="dash-grip" aria-hidden="true" title="Перетащите блок"><GripVertical size={16} /></span>
              <button type="button" onClick={() => onMove(-1)} disabled={!canUp} aria-label={`Поднять блок «${title}» выше`}><ChevronUp size={16} /></button>
              <button type="button" onClick={() => onMove(1)} disabled={!canDown} aria-label={`Опустить блок «${title}» ниже`}><ChevronDown size={16} /></button>
            </>
          )}
          <button type="button" className="dash-collapse" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? `Развернуть «${title}»` : `Свернуть «${title}»`}>
            <ChevronDown size={18} className={cn("transition-transform", !collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
      {!collapsed && children}
    </section>
  );
}
