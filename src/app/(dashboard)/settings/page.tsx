import type { Metadata } from "next";
import { SettingsView } from "@/components/couple/settings-view";

export const metadata: Metadata = { title: "Настройки" };

export default function Page() {
  return <SettingsView />;
}
