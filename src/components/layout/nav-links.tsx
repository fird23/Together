"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, CalendarDays, Target, ListChecks, MessagesSquare, Plus, type LucideIcon } from "lucide-react";
import { QuickActions } from "@/components/layout/quick-actions";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { featureOn, type FeatureKey } from "@/utils/features";
import { cn } from "@/utils/cn";

const items: { href: string; label: string; icon: LucideIcon; feature?: FeatureKey }[] = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/habits", label: "Привычки", icon: Target, feature: "habits" },
  { href: "/todos", label: "Дела", icon: ListChecks, feature: "todos" },
  { href: "/talk", label: "Разговоры", icon: MessagesSquare, feature: "talk" },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
];

function useNavItems() {
  const { couple } = useWorkspace();
  return items.filter((item) => !item.feature || featureOn(couple, item.feature));
}

export function DesktopNav() {
  const pathname = usePathname();
  const items = useNavItems();
  return (
    <nav aria-label="Основная навигация" className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-3 text-[15px] font-medium transition-colors lg:px-4",
              active ? "bg-accent-100 text-accent-700" : "text-ink-soft hover:bg-sand-100 hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const all = useNavItems();
  const [quick, setQuick] = useState(false);
  // На телефоне: два раздела слева, «+» по центру и два справа. «Привычки» открываются через «+» и с главной.
  const side = all.filter((i) => i.href !== "/habits");
  const left = side.filter((i) => i.href === "/dashboard" || i.href === "/calendar");
  const right = side.filter((i) => i.href === "/todos" || i.href === "/talk");

  const renderItem = ({ href, label, icon: Icon }: (typeof items)[number]) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors", active ? "text-accent-700" : "text-ink-soft")}
        >
          <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent-100")}>
            <Icon className="size-5" aria-hidden />
          </span>
          {label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="flex items-end">
          {left.map(renderItem)}
          <li className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => setQuick(true)}
              aria-label="Быстрые действия"
              aria-haspopup="dialog"
              className="-mt-5 mb-2 grid size-14 place-items-center rounded-full bg-accent-600 text-on-accent shadow-lift ring-4 ring-paper transition-transform active:scale-95"
            >
              <Plus className="size-7" aria-hidden />
            </button>
          </li>
          {right.map(renderItem)}
        </ul>
      </nav>
      <QuickActions open={quick} onClose={() => setQuick(false)} />
    </>
  );
}
