import { Home, CalendarDays, Target, ListChecks, MessagesSquare, Settings, type LucideIcon } from "lucide-react";
import type { FeatureKey } from "@/utils/features";

export type NavId = "dashboard" | "calendar" | "habits" | "todos" | "talk" | "settings";
export type NavDef = { id: NavId; href: string; label: string; icon: LucideIcon; feature?: FeatureKey };

/** Все разделы, которые можно поставить в нижнюю панель телефона. */
export const NAV_DEFS: Record<NavId, NavDef> = {
  dashboard: { id: "dashboard", href: "/dashboard", label: "Главная", icon: Home },
  calendar: { id: "calendar", href: "/calendar", label: "Календарь", icon: CalendarDays },
  habits: { id: "habits", href: "/habits", label: "Привычки", icon: Target, feature: "habits" },
  todos: { id: "todos", href: "/todos", label: "Дела", icon: ListChecks, feature: "todos" },
  talk: { id: "talk", href: "/talk", label: "Разговоры", icon: MessagesSquare, feature: "talk" },
  settings: { id: "settings", href: "/settings", label: "Настройки", icon: Settings },
};
export const NAV_IDS = Object.keys(NAV_DEFS) as NavId[];
/** Порядок в верхней навигации на компьютере. */
export const DESKTOP_NAV_IDS: NavId[] = ["dashboard", "habits", "todos", "talk", "calendar"];
