import { cn } from "@/utils/cn";

/** Переключатель «включено / выключено». Сам состояния не хранит. */
export function Switch({
  checked, onChange, label, disabled, className,
}: {
  checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent-600" : "bg-sand-300",
        className,
      )}
    >
      <span className={cn("absolute left-0.5 size-6 rounded-full bg-paper shadow-sm transition-transform duration-200", checked && "translate-x-5")} />
    </button>
  );
}
