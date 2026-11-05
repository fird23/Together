"use client";

import { useLayoutEffect, useRef } from "react";
import { DAYS_FORMS, pluralRu } from "@/utils/days";

const format = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

/**
 * Крупный счётчик. При открытии страницы число «набегает» от нуля — единственная
 * самопроизвольная анимация в интерфейсе. При включённом «уменьшении движения» показывается сразу.
 */
export function DayCounter({ days }: { days: number }) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const word = pluralRu(days, DAYS_FORMS);

  useLayoutEffect(() => {
    const el = numberRef.current;
    if (!el) return;
    el.textContent = format(days);
    if (days === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = Math.min(1500, 600 + days * 1.5);
    const start = performance.now();
    let frame = 0;
    el.textContent = format(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(Math.round(days * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [days]);

  return (
    <p className="mt-1">
      <span className="sr-only">
        Мы вместе уже {format(days)} {word}
      </span>
      <span aria-hidden className="flex items-baseline justify-center gap-3 sm:gap-4">
        <span
          ref={numberRef}
          className="font-serif text-[clamp(4.5rem,22vw,9.5rem)] font-medium leading-none tracking-[-0.04em] tabular-nums"
        />
        <span className="font-serif text-3xl text-ink sm:text-4xl">{word}</span>
      </span>
    </p>
  );
}
