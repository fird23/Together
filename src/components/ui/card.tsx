import { cn } from "@/utils/cn";

const paddings = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

/** Обычная поверхность. Крупная «hero»-поверхность и тонированные вставки собираются отдельно. */
export function Card({
  padding = "md",
  className,
  ...props
}: React.ComponentProps<"div"> & { padding?: keyof typeof paddings }) {
  return <div className={cn("rounded-card bg-paper shadow-soft ring-1 ring-sand-200", paddings[padding], className)} {...props} />;
}
