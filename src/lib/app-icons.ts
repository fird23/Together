/** Варианты иконки Together. Для Android-приложения переключаются по-настоящему, для сайта влияют на ярлык «На экран Домой». */
export type AppIconId = "classic" | "night" | "sunset" | "mint" | "rose" | "graphite";

export const APP_ICONS: { id: AppIconId; label: string }[] = [
  { id: "classic", label: "Классика" },
  { id: "night", label: "Ночь" },
  { id: "sunset", label: "Закат" },
  { id: "mint", label: "Мята" },
  { id: "rose", label: "Роза" },
  { id: "graphite", label: "Графит" },
];

export const isIconId = (v: unknown): v is AppIconId => APP_ICONS.some((i) => i.id === v);

/** Файлы иконки: у «Классики» прежние, у остальных свои в /icons/variants/<id>/. */
export const iconFile = (id: AppIconId, file: "icon-192.png" | "icon-512.png" | "icon-maskable-512.png" | "apple-touch-icon.png") =>
  id === "classic" ? `/icons/${file}` : `/icons/variants/${id}/${file}`;

const KEY = "together-web-icon";

export const savedWebIcon = (): AppIconId => {
  try { const v = window.localStorage.getItem(KEY); return isIconId(v) ? v : "classic"; } catch { return "classic"; }
};

/**
 * Подменяет иконку страницы и манифест: iPhone и Chrome берут их в момент добавления ярлыка на экран «Домой».
 * Уже добавленный ярлык не меняется: его нужно удалить и добавить заново.
 */
export function applyWebIcon(id: AppIconId, remember = true) {
  if (remember) { try { window.localStorage.setItem(KEY, id); } catch { /* ignore */ } }
  const set = (selector: string, href: string, create?: () => HTMLLinkElement) => {
    const link = document.head.querySelector<HTMLLinkElement>(selector) ?? create?.();
    if (link) link.href = href;
  };
  const make = (rel: string) => () => { const l = document.createElement("link"); l.rel = rel; document.head.appendChild(l); return l; };
  set('link[rel="apple-touch-icon"]', iconFile(id, "apple-touch-icon.png"), make("apple-touch-icon"));
  set('link[rel="icon"]', iconFile(id, "icon-192.png"));
  set('link[rel="manifest"]', id === "classic" ? "/manifest.webmanifest" : `/api/app-manifest/${id}`);
}
