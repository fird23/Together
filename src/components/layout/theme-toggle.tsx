"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/**
 * Быстрый переключатель светлой и тёмной темы. Какая иконка видна, решает CSS по атрибуту
 * data-mode на <html>, поэтому при загрузке страницы иконка не «моргает».
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={resolved === "dark"}
      aria-label="Тёмная тема"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand-100 hover:text-ink"
    >
      <Moon className="size-5 [[data-mode=dark]_&]:hidden" aria-hidden />
      <Sun className="hidden size-5 [[data-mode=dark]_&]:block" aria-hidden />
    </button>
  );
}
