"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, CalendarDays, Target } from "lucide-react";
import { cn } from "@/utils/cn";

const items = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/habits", label: "Привычки", icon: Target },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация" className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors",
              active ? "bg-accent-100 text-accent-700" : "text-ink-soft hover:bg-sand-100 hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-accent-700" : "text-ink-soft",
                )}
              >
                <span className={cn("grid h-7 w-14 place-items-center rounded-full transition-colors", active && "bg-accent-100")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
