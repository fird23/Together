import { NativeBridge } from "@/components/native/native-bridge";
import { KeyboardAware } from "@/components/layout/keyboard-aware";
import { ErrorReporter } from "@/components/layout/error-reporter";
import { AppIconApplier } from "@/components/native/app-icon-applier";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeInitScript } from "@/lib/theme-script";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";

export const metadata: Metadata = {
  title: { default: "Together — пространство для двоих", template: "%s — Together" },
  description: "Приватное приложение для пар: общие дни, важные даты и профиль партнёра.",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Together", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F7F5EC",
  // Android: при открытии клавиатуры страница уменьшается, а не прячется под ней
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="hydrangea" data-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NativeBridge />
        <KeyboardAware />
        <ErrorReporter />
        <AppIconApplier />
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
