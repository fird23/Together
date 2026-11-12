import type { Metadata } from "next";
import { AdminView } from "@/components/admin/admin-view";

export const metadata: Metadata = { title: "Админ-панель" };

export default function Page() {
  return <AdminView />;
}
