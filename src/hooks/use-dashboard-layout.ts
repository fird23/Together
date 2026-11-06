"use client";

import { useSyncExternalStore } from "react";
import { getLayout, getServerLayout, subscribeLayout } from "@/lib/layout-store";

export function useDashboardLayout() {
  return useSyncExternalStore(subscribeLayout, getLayout, getServerLayout);
}
