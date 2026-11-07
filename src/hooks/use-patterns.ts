"use client";

import { useSyncExternalStore } from "react";
import { getPatterns, setPatterns, subscribePatterns } from "@/lib/pattern-store";

export function usePatterns() {
  const on = useSyncExternalStore(subscribePatterns, getPatterns, () => true);
  return { on, setOn: setPatterns };
}
