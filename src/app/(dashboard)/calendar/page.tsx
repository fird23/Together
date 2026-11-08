import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarPage } from "@/components/couple/calendar-page";

export const metadata: Metadata = { title: "Календарь" };

export default function Page() {
  // useSearchParams (открытие календаря на нужном дне) требует Suspense
  return (
    <Suspense fallback={null}>
      <CalendarPage />
    </Suspense>
  );
}
