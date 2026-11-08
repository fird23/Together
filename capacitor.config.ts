import { readFileSync } from "node:fs";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android-приложение Together: оболочка над сайтом.
 * Адрес сайта берётся из файла server-url.txt (или из переменной CAP_SERVER_URL).
 * Без адреса приложение покажет заглушку из capacitor-www/index.html.
 */
function readServerUrl(): string | undefined {
  const fromEnv = process.env.CAP_SERVER_URL?.trim();
  if (fromEnv?.startsWith("https://")) return fromEnv.replace(/\/+$/, "");
  try {
    const line = readFileSync("server-url.txt", "utf8").split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
    return line?.startsWith("https://") ? line.replace(/\/+$/, "") : undefined;
  } catch {
    return undefined;
  }
}
const serverUrl = readServerUrl();

const config: CapacitorConfig = {
  appId: "com.together.app",
  appName: "Together",
  webDir: "capacitor-www",
  server: serverUrl
    ? { url: serverUrl, androidScheme: "https", cleartext: false, allowNavigation: ["*.supabase.co"] }
    : { androidScheme: "https" },
  android: { backgroundColor: "#F7F5EC", allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: false, backgroundColor: "#F7F5EC", showSpinner: false },
    StatusBar: { overlaysWebView: false },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
