import type { Metadata } from "next";
import { TalkView } from "@/components/talk/talk-view";

export const metadata: Metadata = { title: "Разговоры" };
export default function Page() { return <TalkView />; }
