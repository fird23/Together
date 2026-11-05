import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-control bg-[linear-gradient(90deg,var(--color-sand-100),var(--color-sand-200),var(--color-sand-100))] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
