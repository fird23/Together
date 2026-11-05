import type { Metadata } from "next";
import { DashboardView } from "@/components/couple/dashboard-view";

export const metadata: Metadata = { title: "Главная" };

export default function Page() {
  return <DashboardView />;
}
