import type { Metadata } from "next";
import { ConnectView } from "@/components/couple/connect-view";

export const metadata: Metadata = { title: "Подключение к паре" };

export default function Page() {
  return <ConnectView />;
}
