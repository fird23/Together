import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  THEMES,
  THEME_STORAGE_KEY,
  isModePreference,
  isThemeId,
  type ModePreference,
  type ResolvedMode,
  type ThemeId,
} from "@/lib/themes";

/**
 * Хранилище настроек оформления (тема и режим) в localStorage браузера.
 * Подключается к React через useSyncExternalStore, поэтому все компоненты
 * обновляются сами, а при серверной отрисовке используются значения по умолчанию.
 */
const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();
let watching = false;

function read<T extends string>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return guard(value) ? value : fallback;
  } catch {
    return fallback; // приватный режим или запрет хранилища
  }
}

export const getTheme = (): ThemeId => read(THEME_STORAGE_KEY, isThemeId, DEFAULT_THEME);
export const getModePreference = (): ModePreference => read(MODE_STORAGE_KEY, isModePreference, DEFAULT_MODE);
export const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

export function resolveMode(preference: ModePreference = getModePreference()): ResolvedMode {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference;
}

/** Переносит текущие настройки на <html>. animate включает плавную смену цветов. */
function apply(animate: boolean) {
  const root = document.documentElement;
  const theme = getTheme();
  const mode = resolveMode();

  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 300);
  }
  root.dataset.theme = theme;
  root.dataset.mode = mode;

  const background = THEMES.find((item) => item.id === theme)?.bg[mode];
  if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* без хранилища тема просто не запомнится после перезагрузки */
  }
  apply(true);
  notify();
}

export const setTheme = (theme: ThemeId) => persist(THEME_STORAGE_KEY, theme);
export const setModePreference = (mode: ModePreference) => persist(MODE_STORAGE_KEY, mode);

/** Подписка для useSyncExternalStore: отслеживает и наши изменения, и смену темы ОС, и другие вкладки. */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    window.matchMedia(DARK_QUERY).addEventListener("change", () => {
      if (getModePreference() === "system") {
        apply(true);
        notify();
      }
    });
    window.addEventListener("storage", (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === MODE_STORAGE_KEY || event.key === null) {
        apply(false);
        notify();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}
