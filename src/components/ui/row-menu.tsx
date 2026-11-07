"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";

export type RowMenuItem = { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean };

/** Кнопка «⋯» с меню действий. На телефоне заменяет кнопки «изменить» и «удалить» в строке. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !button.current?.contains(t)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
  }

  return (
    <div className="row-menu">
      <button ref={button} type="button" onClick={toggle} aria-label={`Действия: ${label}`} aria-haspopup="menu" aria-expanded={pos !== null}>
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {pos && createPortal(
        <div ref={pop} role="menu" className="row-menu-pop" style={{ top: pos.top, right: pos.right }}>
          {items.map(({ label: text, icon: Icon, onClick, danger }) => (
            <button key={text} type="button" role="menuitem" className={danger ? "danger" : ""} onClick={() => { setPos(null); onClick(); }}>
              <Icon size={16} aria-hidden="true" />{text}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
