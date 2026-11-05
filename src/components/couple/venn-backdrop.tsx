import { cn } from "@/utils/cn";

/** Два больших пересекающихся круга. Единственный «громкий» элемент дизайна, остальное спокойное. */
export function VennBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-[80%] -translate-y-1/2 rounded-full bg-accent-100/90 [mix-blend-mode:var(--venn-blend)] sm:size-[560px]" />
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-[20%] -translate-y-1/2 rounded-full bg-accent-200/60 [mix-blend-mode:var(--venn-blend)] sm:size-[560px]" />
    </div>
  );
}
