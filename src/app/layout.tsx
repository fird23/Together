import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Together — пространство для двоих",
  description: "Приватное приложение для пар: общие дни, события и воспоминания.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
