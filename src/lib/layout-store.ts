/**
 * Порядок и свёрнутость блоков на главной. Хранится на этом устройстве (как тема).
 * Основная часть («Мы вместе уже», календарь, настроение) здесь не участвует: её менять нельзя.
 */
const KEY = "together-dashboard-layout";

export const BLOCK_IDS = ["habits", "wishlist", "todos", "talk", "gratitude", "weekly"] as const;
export type BlockId = (typeof BLOCK_IDS)[number];
export type Layout = { order: BlockId[]; collapsed: BlockId[] };

const DEFAULT: Layout = { order: [...BLOCK_IDS], collapsed: [] };
const listeners = new Set<() => void>();
let cache: Layout | null = null;

const isBlock = (x: unknown): x is BlockId => typeof x === "string" && (BLOCK_IDS as readonly string[]).includes(x);

function sanitize(raw: unknown): Layout {
  const r = (raw ?? {}) as { order?: unknown; collapsed?: unknown };
  const order = Array.isArray(r.order) ? r.order.filter(isBlock) : [];
  const unique = [...new Set(order)];
  for (const id of BLOCK_IDS) if (!unique.includes(id)) unique.push(id); // новые блоки появляются внизу
  const collapsed = Array.isArray(r.collapsed) ? [...new Set(r.collapsed.filter(isBlock))] : [];
  return { order: unique, collapsed };
}

function read(): Layout {
  try {
    const text = window.localStorage.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : DEFAULT;
  } catch { return DEFAULT; }
}

export function getLayout(): Layout {
  if (typeof window === "undefined") return DEFAULT;
  if (!cache) cache = read();
  return cache;
}
export const getServerLayout = () => DEFAULT;

function commit(next: Layout) {
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* без хранилища порядок живёт до перезагрузки */ }
  listeners.forEach((l) => l());
}

export function subscribeLayout(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; listener(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

/** Перемещает блок `id` на место блока `target`. */
export function reorderBlock(id: BlockId, target: BlockId) {
  const { order, collapsed } = getLayout();
  const from = order.indexOf(id), to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  commit({ order: next, collapsed });
}

/** Сдвигает блок на шаг вверх (-1) или вниз (+1) среди видимых блоков. */
export function moveBlock(id: BlockId, dir: -1 | 1, visible: BlockId[]) {
  const i = visible.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= visible.length) return;
  reorderBlock(id, visible[j]);
}

export function toggleCollapsed(id: BlockId) {
  const { order, collapsed } = getLayout();
  commit({ order, collapsed: collapsed.includes(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id] });
}

export function resetLayout() { commit({ order: [...BLOCK_IDS], collapsed: [] }); }
