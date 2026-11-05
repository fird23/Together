"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { DesktopNav, MobileNav } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useWorkspace } from "@/components/providers/workspace-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, session } = useWorkspace();
  const name = profile?.display_name ?? (session?.user.user_metadata?.display_name as string | undefined) ?? "Вы";

  return (
    <div className="min-h-dvh bg-milk">
      <header className="sticky top-0 z-20 border-b border-sand-200 bg-milk/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo href="/dashboard" />
          <DesktopNav />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/profile" aria-label="Мой профиль" className="rounded-full">
              <Avatar name={name} src={profile?.avatar_url} size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-8 md:pb-16 md:pt-10">{children}</main>
      <MobileNav />
    </div>
  );
}
