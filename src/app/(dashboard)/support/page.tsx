import type { Metadata } from "next";
import { SupportView } from "@/components/support/support-view";

export const metadata: Metadata = { title: "Поддержка" };

export default function Page() {
  return <SupportView />;
}
