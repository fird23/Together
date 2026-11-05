import type { Metadata } from "next";
import { CalendarPage } from "@/components/couple/calendar-page";
export const metadata: Metadata = { title: "Календарь" };
export default function Page() { return <CalendarPage />; }
