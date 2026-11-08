"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#E9A93B", "#D9708E", "#6C8FD6", "#6FAE6B", "#9A82C9", "#D98B5B"];

/** Конфетти и подпись после выполнения привычки: «first» — небольшая россыпь, «all» — полный салют. */
export function ConfettiBurst({ kind, onDone }: { kind: "first" | "all"; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, kind === "all" ? 4200 : 2600);
    return () => clearTimeout(timer);
  }, [kind, onDone]);

  const count = kind === "all" ? 72 : 18;
  return createPortal(
    <div className={`celebrate celebrate-${kind}`}>
      <div aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <i
            key={i}
            style={{
              "--x": `${(i * 53 + 7) % 100}%`,
              "--delay": `${(i % 9) * 0.09}s`,
              "--dur": `${(kind === "all" ? 2.6 : 1.9) + (i % 6) * 0.22}s`,
              "--rot": `${(i * 67) % 720}deg`,
              "--sway": `${((i % 5) - 2) * 18}px`,
              "--w": `${6 + (i % 3) * 2}px`,
              "--h": `${10 + (i % 4) * 2}px`,
              "--c": COLORS[i % COLORS.length],
            } as React.CSSProperties}
          />
        ))}
      </div>
      <p role="status" className="celebrate-toast">{kind === "all" ? "Все привычки на сегодня выполнены! 🎉" : "Первая привычка за сегодня! 🌱"}</p>
    </div>,
    document.body,
  );
}
