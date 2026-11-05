import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InviteView } from "@/components/couple/invite-view";

export const metadata: Metadata = { title: "Приглашение в пару" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-dvh flex-col bg-milk">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto my-auto w-full max-w-md px-5 pb-20 pt-6">
        <InviteView token={token} />
      </main>
    </div>
  );
}
