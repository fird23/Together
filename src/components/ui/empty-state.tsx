import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          tone === "error" ? "bg-danger-soft text-danger" : "bg-accent-100 text-accent-700",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{action}</div>}
    </div>
  );
}
