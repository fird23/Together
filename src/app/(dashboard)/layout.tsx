import { AuthGate } from "@/components/providers/gates";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
