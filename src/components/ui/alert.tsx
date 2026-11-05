import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/utils/cn";

type Tone = "info" | "success" | "error";

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "bg-sand-100 text-ink ring-sand-200", icon: Info },
  success: { box: "bg-success-soft text-success ring-success/20", icon: CheckCircle2 },
  error: { box: "bg-danger-soft text-danger ring-danger/20", icon: AlertCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-control p-3.5 text-sm ring-1", box, className)}>
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>}
      </div>
    </div>
  );
}
