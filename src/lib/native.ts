import { Capacitor, registerPlugin } from "@capacitor/core";

/** Запущено ли приложение внутри Android-оболочки (Capacitor), а не в браузере. */
export const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();
export const nativePlatform = () => (typeof window === "undefined" ? "web" : Capacitor.getPlatform());

/** Свой нативный плагин (android/.../TogetherNativePlugin.java). В старой сборке приложения его нет, поэтому вызовы всегда в try/catch. */
export type TogetherNativePlugin = {
  isPushAvailable(): Promise<{ available: boolean }>;
  setWidgetData(options: { json: string }): Promise<void>;
  pinWidget(): Promise<{ requested: boolean }>;
};
export const TogetherNative = registerPlugin<TogetherNativePlugin>("TogetherNative");
