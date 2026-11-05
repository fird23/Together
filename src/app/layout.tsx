import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeInitScript } from "@/lib/theme-script";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";

export const metadata: Metadata = {
  title: { default: "Together — пространство для двоих", template: "%s — Together" },
  description: "Приватное приложение для пар: общие дни, важные даты и профиль партнёра.",
};

export const viewport: Viewport = {
  themeColor: "#F7F5EC",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="hydrangea" data-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
