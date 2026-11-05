import { AuthGate } from "@/components/providers/gates";
import { OnboardingShell } from "@/components/layout/onboarding-shell";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <OnboardingShell>{children}</OnboardingShell>
    </AuthGate>
  );
}
