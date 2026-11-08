"use client";

import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { isNativeApp } from "@/lib/native";

/**
 * Связь сайта с Android-оболочкой: скрывает заставку, обрабатывает кнопку «назад»
 * и красит статус-бар под текущую тему. В обычном браузере ничего не делает.
 */
export function NativeBridge() {
  const { theme, resolved } = useTheme();

  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ App }, { SplashScreen }] = await Promise.all([import("@capacitor/app"), import("@capacitor/splash-screen")]);
      await SplashScreen.hide({ fadeOutDuration: 250 });
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.exitApp();
      });
      if (cancelled) void handle.remove(); else remove = () => void handle.remove();
    })().catch(() => {});
    return () => { cancelled = true; remove?.(); };
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--c-milk").trim();
      await StatusBar.setStyle({ style: resolved === "dark" ? Style.Dark : Style.Light });
      if (/^#[0-9a-f]{6}$/i.test(bg)) await StatusBar.setBackgroundColor({ color: bg });
    })().catch(() => {});
  }, [theme, resolved]);

  return null;
}
