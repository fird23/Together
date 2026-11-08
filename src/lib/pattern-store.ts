/**
 * Узоры на фоне карточки «Мы вместе уже»: включены по умолчанию, выбор хранится на этом устройстве.
 * Значение переносится на <html data-patterns>, а CSS решает, что показать.
 */
const KEY = "together-patterns";
const listeners = new Set<() => void>();

export function getPatterns(): boolean {
  try { return window.localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function setPatterns(on: boolean) {
  try { window.localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* без хранилища выбор не запомнится */ }
  document.documentElement.dataset.patterns = on ? "on" : "off";
  listeners.forEach((l) => l());
}

export function subscribePatterns(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) { document.documentElement.dataset.patterns = getPatterns() ? "on" : "off"; listener(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
