import type { Metadata } from "next";
import { HabitsView } from "@/components/habits/habits-view";

export const metadata: Metadata = { title: "Привычки" };
export default function Page() { return <HabitsView />; }
