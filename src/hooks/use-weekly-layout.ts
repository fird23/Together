"use client";

import { useSyncExternalStore } from "react";
import { getServerWeeklyLayout, getWeeklyLayout, subscribeWeeklyLayout } from "@/lib/weekly-layout-store";

export function useWeeklyLayout() {
  return useSyncExternalStore(subscribeWeeklyLayout, getWeeklyLayout, getServerWeeklyLayout);
}
