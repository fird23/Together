import { isNativeApp } from "@/lib/native";

/** Версия сайта: короткий хеш коммита (на Vercel) или «dev». */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Где открыт Together. Нужно только для статистики и журнала ошибок. */
export function platformName(): string {
  if (typeof window === "undefined") return "server";
  if (isNativeApp()) return "android-app";
  const ua = navigator.userAgent;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (/iPhone|iPad|iPod/.test(ua)) return standalone ? "ios-pwa" : "ios-web";
  if (/Android/.test(ua)) return standalone ? "android-pwa" : "android-web";
  return "desktop";
}

/** Версия сайта и, в приложении для Android, версия самой оболочки. */
export async function buildLabel(): Promise<string> {
  if (!isNativeApp()) return BUILD_ID;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return `${BUILD_ID} · v${info.version}`.slice(0, 24);
  } catch { return BUILD_ID; }
}
