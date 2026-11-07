/**
 * Список тем и общие настройки. Сами цвета лежат в src/app/globals.css.
 * Файл можно безопасно импортировать и на сервере, и в браузере.
 */
export const THEMES = [
  {
    "id": "hydrangea",
    "name": "Гортензия",
    "bg": {
      "light": "#F7F5EC",
      "dark": "#12152A"
    }
  },
  {
    "id": "rose",
    "name": "Роза",
    "bg": {
      "light": "#FBF7F2",
      "dark": "#1B1417"
    }
  },
  {
    "id": "sage",
    "name": "Шалфей",
    "bg": {
      "light": "#F4F6F1",
      "dark": "#101713"
    }
  },
  {
    "id": "sunset",
    "name": "Закат",
    "bg": {
      "light": "#FBF5EE",
      "dark": "#1A1310"
    }
  },
  {
    "id": "ocean",
    "name": "Океан",
    "bg": {
      "light": "#F1F7F8",
      "dark": "#0B171A"
    }
  },
  {
    "id": "lavender",
    "name": "Лаванда",
    "bg": {
      "light": "#F6F2FA",
      "dark": "#171321"
    }
  },
  {
    "id": "newyear",
    "name": "Новый год ❄",
    "bg": {
      "light": "#F2F6FB",
      "dark": "#0B1426"
    }
  },
  {
    "id": "halloween",
    "name": "Хэллоуин 🎃",
    "bg": {
      "light": "#FBF4EA",
      "dark": "#120D1A"
    }
  },
  {
    "id": "birthday",
    "name": "День рождения 🎂",
    "bg": {
      "light": "#FFF8F0",
      "dark": "#1D1020"
    }
  }
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ModePreference = "light" | "dark" | "system";
export type ResolvedMode = "light" | "dark";

export const DEFAULT_THEME: ThemeId = "hydrangea";
export const DEFAULT_MODE: ModePreference = "system";
export const THEME_STORAGE_KEY = "together-theme";
export const MODE_STORAGE_KEY = "together-mode";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function isModePreference(value: unknown): value is ModePreference {
  return value === "light" || value === "dark" || value === "system";
}
