"use client";

import { LogOut } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/providers/workspace-provider";

/** Лёгкий каркас для тех, у кого ещё нет пары: без меню, только логотип и выход. */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useWorkspace();
  return (
    <div className="min-h-dvh bg-milk">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-3">
          <ThemeToggle />
          {profile && <span className="hidden text-sm text-ink-soft sm:inline">{profile.display_name}</span>}
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden /> Выйти
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
