import type { Metadata } from "next";
import { CreateCoupleView } from "@/components/couple/create-couple-view";

export const metadata: Metadata = { title: "Создание пары" };

export default function Page() {
  return <CreateCoupleView />;
}
