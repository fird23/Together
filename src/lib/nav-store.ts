import { NAV_IDS, type NavId } from "@/lib/nav-items";

/**
 * Нижняя панель телефона: какие разделы и в каком порядке, и нужна ли кнопка «+» по центру.
 * Хранится на этом устройстве (как тема и порядок блоков главной).
 */
const KEY = "together-bottom-nav";

export type NavConfig = { items: NavId[]; plus: boolean };
export const DEFAULT_NAV: NavConfig = { items: ["dashboard", "calendar", "todos", "talk"], plus: true };
export const maxNavItems = (plus: boolean) => (plus ? 4 : 5);
export const MIN_NAV_ITEMS = 2;

const listeners = new Set<() => void>();
let cache: NavConfig | null = null;

const isNav = (x: unknown): x is NavId => typeof x === "string" && (NAV_IDS as string[]).includes(x);

function sanitize(raw: unknown): NavConfig {
  const r = (raw ?? {}) as { items?: unknown; plus?: unknown };
  const plus = typeof r.plus === "boolean" ? r.plus : true;
  const items = Array.isArray(r.items) ? [...new Set(r.items.filter(isNav))].slice(0, maxNavItems(plus)) : [];
  return items.length >= MIN_NAV_ITEMS ? { items, plus } : { ...DEFAULT_NAV, plus };
}

function read(): NavConfig {
  try {
    const text = window.localStorage.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : DEFAULT_NAV;
  } catch { return DEFAULT_NAV; }
}

export function getNavConfig(): NavConfig {
  if (typeof window === "undefined") return DEFAULT_NAV;
  if (!cache) cache = read();
  return cache;
}
export const getServerNavConfig = () => DEFAULT_NAV;

function commit(next: NavConfig) {
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* без хранилища настройка живёт до перезагрузки */ }
  listeners.forEach((l) => l());
}

export function subscribeNav(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; listener(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

export function addNavItem(id: NavId) {
  const { items, plus } = getNavConfig();
  if (items.includes(id) || items.length >= maxNavItems(plus)) return;
  commit({ items: [...items, id], plus });
}
export function removeNavItem(id: NavId) {
  const { items, plus } = getNavConfig();
  if (items.length <= MIN_NAV_ITEMS) return;
  commit({ items: items.filter((x) => x !== id), plus });
}
export function moveNavItem(id: NavId, dir: -1 | 1) {
  const { items, plus } = getNavConfig();
  const i = items.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  commit({ items: next, plus });
}
/** Включает или выключает «+»; без «+» в панель помещается пять разделов, с ним — четыре. */
export function setNavPlus(plus: boolean) {
  const { items } = getNavConfig();
  commit({ items: items.slice(0, maxNavItems(plus)), plus });
}
export const resetNav = () => commit(DEFAULT_NAV);
