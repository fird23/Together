import { Suspense } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { FullScreenLoader, GuestGate } from "@/components/providers/gates";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <GuestGate>
        <AuthShell>{children}</AuthShell>
      </GuestGate>
    </Suspense>
  );
}
