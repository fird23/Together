"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const TRIGGER = 64;
// В этих местах жест не нужен: окна, поля ввода, ползунки и горизонтальные прокрутки.
const IGNORE = '[role="dialog"], [aria-modal="true"], input, textarea, select, [data-no-pull], .settings-chips, .hx-medals, .hx-heat-wrap';

/** Обновление страницы потягиванием вниз на телефоне (в оболочке приложения встроенного жеста нет). */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return;
    const set = (v: number) => { pullRef.current = v; setPull(v); };

    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (window.scrollY > 0 || e.touches.length !== 1 || target?.closest(IGNORE) || document.body.style.overflow === "hidden") { start.current = null; return; }
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      if (window.scrollY > 0 || dy <= 0 || dx > dy) { start.current = null; set(0); return; }
      set(Math.min(96, dy * 0.45));
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (pullRef.current >= TRIGGER * 0.6) { setRefreshing(true); set(TRIGGER * 0.8); window.setTimeout(() => window.location.reload(), 150); }
      else set(0);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;
  const ready = pull >= TRIGGER * 0.6;
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${pull - 8}px)`, opacity: Math.min(1, pull / 40) }} role="status" aria-live="polite">
      <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }} aria-hidden />
      <span className="sr-only">{refreshing ? "Обновляем страницу" : ready ? "Отпустите, чтобы обновить" : "Потяните вниз, чтобы обновить"}</span>
    </div>
  );
}
