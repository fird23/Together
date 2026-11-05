"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_MODE, DEFAULT_THEME, type ModePreference, type ResolvedMode, type ThemeId } from "@/lib/themes";
import { getModePreference, getTheme, resolveMode, setModePreference, setTheme, subscribe, systemPrefersDark } from "@/lib/theme-store";

/** Текущая тема и режим. На сервере и при гидратации возвращает значения по умолчанию, затем обновляется. */
export function useTheme() {
  const theme = useSyncExternalStore<ThemeId>(subscribe, getTheme, () => DEFAULT_THEME);
  const mode = useSyncExternalStore<ModePreference>(subscribe, getModePreference, () => DEFAULT_MODE);
  const systemDark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);
  const resolved: ResolvedMode = mode === "system" ? (systemDark ? "dark" : "light") : resolveMode(mode);

  return {
    theme,
    mode,
    resolved,
    setTheme,
    setMode: setModePreference,
    /** Явно переключает светлую и тёмную (выходит из режима «как в системе»). */
    toggle: () => setModePreference(resolved === "dark" ? "light" : "dark"),
  };
}
