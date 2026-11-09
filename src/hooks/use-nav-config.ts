"use client";

import { useSyncExternalStore } from "react";
import { getNavConfig, getServerNavConfig, subscribeNav } from "@/lib/nav-store";

export function useNavConfig() {
  return useSyncExternalStore(subscribeNav, getNavConfig, getServerNavConfig);
}
