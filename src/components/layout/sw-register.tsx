"use client";

import { useEffect } from "react";

/**
 * Регистрирует service worker сразу при открытии сайта, а не только после включения уведомлений.
 * Благодаря этому при пропаже сети (в том числе в Android-приложении) открывается страница «Нет соединения»,
 * а не пустой экран браузера.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
