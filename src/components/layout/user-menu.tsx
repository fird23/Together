"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LifeBuoy, LogOut, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useWorkspace } from "@/components/providers/workspace-provider";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/profile", label: "Профиль", icon: UserRound },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/support", label: "Поддержка", icon: LifeBuoy },
];

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-sand-100 hover:text-ink focus-visible:bg-sand-100 focus-visible:text-ink focus-visible:outline-none";

/**
 * Круг с аватаркой: наведение открывает меню, клик ведёт в профиль.
 * На устройствах без наведения (телефон, планшет) клик открывает меню — «Профиль» там первый пункт.
 */
export function UserMenu() {
  const { profile, session, signOut } = useWorkspace();
  const name = profile?.display_name ?? (session?.user.user_metadata?.display_name as string | undefined) ?? "Вы";
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const cancelClose = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const show = () => { cancelClose(); setOpen(true); };
  const hideSoon = () => { cancelClose(); timer.current = window.setTimeout(() => setOpen(false), 180); };
  const canHover = () => window.matchMedia("(hover: hover)").matches;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  async function logout() {
    setLeaving(true);
    await signOut(); // после выхода провайдер сам ведёт на главную
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => { if (canHover()) show(); }}
      onMouseLeave={() => { if (canHover()) hideSoon(); }}
      onFocus={show}
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) hideSoon(); }}
    >
      <Link
        href="/profile"
        aria-label="Мой профиль и меню"
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-full ring-offset-2 ring-offset-milk transition hover:ring-2 hover:ring-accent-300 focus-visible:ring-2 focus-visible:ring-accent-600"
        onClick={(e) => {
          if (!canHover()) { e.preventDefault(); setOpen((v) => !v); } else setOpen(false);
        }}
      >
        <Avatar name={name} src={profile?.avatar_url} size="sm" />
      </Link>

      {open && (
        // pt-2 — «мостик», чтобы меню не закрывалось, пока курсор едет от аватарки вниз
        <div className="absolute right-0 top-full z-40 w-64 pt-2">
          <div role="menu" aria-label="Меню профиля" className="rounded-card bg-paper p-2 shadow-lift ring-1 ring-sand-200">
            <div className="flex items-center gap-3 px-3 pb-3 pt-2">
              <Avatar name={name} src={profile?.avatar_url} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{name}</p>
              </div>
            </div>
            <div className="border-t border-sand-200 pt-2">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                  <Icon className="size-[18px]" aria-hidden /> {label}
                </Link>
              ))}
            </div>
            <div className="mt-1 border-t border-sand-200 pt-2">
              <button type="button" role="menuitem" onClick={() => void logout()} disabled={leaving} className={`${itemClass} hover:bg-danger-soft hover:text-danger`}>
                <LogOut className="size-[18px]" aria-hidden /> {leaving ? "Выходим…" : "Выйти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
