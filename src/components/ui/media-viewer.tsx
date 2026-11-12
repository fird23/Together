"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize, Minimize, X, ZoomIn, ZoomOut } from "lucide-react";

export type ViewerItem = { src: string; alt: string };

/**
 * Просмотр фото на весь экран: стрелки и свайп между снимками, Esc закрывает,
 * нажатие на снимок увеличивает, кнопка «на весь экран» (где браузер это умеет).
 * `toolbar` и `footer`: свои кнопки и подпись поверх просмотра.
 */
export function MediaViewer({
  items, index, onIndexChange, onClose, toolbar, footer,
}: {
  items: ViewerItem[];
  index: number;
  onIndexChange?: (next: number) => void;
  onClose: () => void;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [zoomedAt, setZoomedAt] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);
  const zoomed = zoomedAt === index;
  const count = items.length;
  const item = items[index];

  const go = useCallback((dir: -1 | 1) => {
    const next = index + dir;
    if (next >= 0 && next < count) onIndexChange?.(next);
  }, [index, count, onIndexChange]);

  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    root.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.body.style.overflow = overflow;
    };
  }, [close, go]);

  // Заранее подгружаем соседние снимки, чтобы листать без паузы.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) if (items[i]) new Image().src = items[i].src;
  }, [index, items]);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void root.current?.requestFullscreen?.().catch(() => {});
  }

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-white outline-none"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 [padding-top:max(0.625rem,env(safe-area-inset-top))]">
        <span className="min-w-14 text-sm tabular-nums text-white/80">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
        <div className="flex items-center gap-1">
          {toolbar}
          <button type="button" onClick={() => setZoomedAt(zoomed ? null : index)} aria-label={zoomed ? "Уменьшить" : "Увеличить"} className="viewer-btn">
            {zoomed ? <ZoomOut size={20} aria-hidden /> : <ZoomIn size={20} aria-hidden />}
          </button>
          {canFullscreen && (
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Выйти из полноэкранного режима" : "На весь экран"} className="viewer-btn hidden sm:grid">
              {fullscreen ? <Minimize size={20} aria-hidden /> : <Maximize size={20} aria-hidden />}
            </button>
          )}
          <button type="button" onClick={close} aria-label="Закрыть" className="viewer-btn"><X size={22} aria-hidden /></button>
        </div>
      </div>

      <div
        className={`relative min-h-0 flex-1 ${zoomed ? "overflow-auto" : "touch-pan-y overflow-hidden"}`}
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; }}
        onPointerUp={(e) => {
          const s = start.current; start.current = null;
          if (!s || zoomed) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; go(dx < 0 ? 1 : -1); }
        }}
        onClick={(e) => { if (e.target === e.currentTarget && !swiped.current) close(); }}
      >
        <div className={zoomed ? "grid min-h-full min-w-full place-items-center" : "grid h-full w-full place-items-center p-2 sm:p-4"} onClick={(e) => { if (e.target === e.currentTarget && !swiped.current) close(); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={item.src}
            src={item.src}
            alt={item.alt}
            draggable={false}
            onClick={() => { if (!swiped.current) setZoomedAt(zoomed ? null : index); }}
            className={zoomed ? "max-w-none cursor-zoom-out select-none [width:min(220%,2400px)]" : "max-h-full max-w-full cursor-zoom-in select-none object-contain"}
          />
        </div>
        {count > 1 && !zoomed && (
          <>
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Предыдущее фото" className="viewer-btn absolute left-2 top-1/2 hidden -translate-y-1/2 bg-black/40 disabled:opacity-30 sm:grid"><ChevronLeft size={26} aria-hidden /></button>
            <button type="button" onClick={() => go(1)} disabled={index === count - 1} aria-label="Следующее фото" className="viewer-btn absolute right-2 top-1/2 hidden -translate-y-1/2 bg-black/40 disabled:opacity-30 sm:grid"><ChevronRight size={26} aria-hidden /></button>
          </>
        )}
      </div>

      {footer && <div className="px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>,
    document.body,
  );
}
