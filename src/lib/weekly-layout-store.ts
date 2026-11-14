/**
 * Порядок и размер плиток в «Итогах недели». Хранится на этом устройстве (как порядок блоков на главной).
 */
const KEY = "together-weekly-layout";

export const TILE_IDS = ["habits", "todos", "gratitude", "moods"] as const;
export type TileId = (typeof TILE_IDS)[number];
export const SIZES = ["compact", "normal", "wide"] as const;
export type TileSize = (typeof SIZES)[number];
export type WeeklyLayout = { order: TileId[]; sizes: Record<TileId, TileSize> };

/** Как было до настройки: три плитки в ряд, настроение на всю ширину. */
const DEFAULT: WeeklyLayout = { order: [...TILE_IDS], sizes: { habits: "normal", todos: "normal", gratitude: "normal", moods: "wide" } };
const listeners = new Set<() => void>();
let cache: WeeklyLayout | null = null;

const isTile = (x: unknown): x is TileId => typeof x === "string" && (TILE_IDS as readonly string[]).includes(x);
const isSize = (x: unknown): x is TileSize => typeof x === "string" && (SIZES as readonly string[]).includes(x);

function sanitize(raw: unknown): WeeklyLayout {
  const r = (raw ?? {}) as { order?: unknown; sizes?: unknown };
  const unique = [...new Set(Array.isArray(r.order) ? r.order.filter(isTile) : [])];
  for (const id of TILE_IDS) if (!unique.includes(id)) unique.push(id); // новые плитки появляются внизу
  const given = (r.sizes ?? {}) as Record<string, unknown>;
  const sizes = Object.fromEntries(TILE_IDS.map((id) => [id, isSize(given[id]) ? given[id] : DEFAULT.sizes[id]])) as Record<TileId, TileSize>;
  return { order: unique, sizes };
}

function read(): WeeklyLayout {
  try {
    const text = window.localStorage.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : DEFAULT;
  } catch { return DEFAULT; }
}

export function getWeeklyLayout(): WeeklyLayout {
  if (typeof window === "undefined") return DEFAULT;
  if (!cache) cache = read();
  return cache;
}
export const getServerWeeklyLayout = () => DEFAULT;

function commit(next: WeeklyLayout) {
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* без хранилища настройка живёт до перезагрузки */ }
  listeners.forEach((l) => l());
}

export function subscribeWeeklyLayout(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; listener(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

/** Сдвигает плитку на шаг назад (-1) или вперёд (+1) среди видимых плиток. */
export function moveTile(id: TileId, dir: -1 | 1, visible: TileId[]) {
  const i = visible.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= visible.length) return;
  const { order, sizes } = getWeeklyLayout();
  const from = order.indexOf(id), to = order.indexOf(visible[j]);
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  commit({ order: next, sizes });
}

export function setTileSize(id: TileId, size: TileSize) {
  const { order, sizes } = getWeeklyLayout();
  if (sizes[id] === size) return;
  commit({ order, sizes: { ...sizes, [id]: size } });
}

export function resetWeeklyLayout() { commit(DEFAULT); }

export function isWeeklyDefault(layout: WeeklyLayout): boolean {
  return layout.order.every((id, i) => id === DEFAULT.order[i]) && TILE_IDS.every((id) => layout.sizes[id] === DEFAULT.sizes[id]);
}
