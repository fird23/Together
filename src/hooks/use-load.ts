"use client";

import { useEffect } from "react";

/**
 * Запускает загрузку данных, когда блок появился на экране, и повторяет её, если функция загрузки изменилась
 * (например, сменилась пара или период). Так во всём приложении загрузка записывается одинаково:
 * вместо useEffect(() => { void load(); }, [load]) пишем useLoad(load).
 */
export function useLoad(load: () => unknown) {
  useEffect(() => { void load(); }, [load]);
}
