"use client";

import { useEffect } from "react";
import { applyWebIcon, savedWebIcon } from "@/lib/app-icons";

/** При открытии сайта подставляет выбранную иконку в ссылки страницы (ничего не рисует). */
export function AppIconApplier() {
  useEffect(() => {
    const id = savedWebIcon();
    if (id !== "classic") applyWebIcon(id, false);
  }, []);
  return null;
}
