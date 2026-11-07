import type { Metadata } from "next";
import { TodosView } from "@/components/todos/todos-view";

export const metadata: Metadata = { title: "Список дел" };
export default function Page() { return <TodosView />; }
