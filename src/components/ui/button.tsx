import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none " +
  "transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.985] " +
  "disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-600 text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_8px_18px_-8px_color-mix(in_oklab,var(--c-accent-600)_55%,transparent)] hover:bg-accent-700",
  secondary: "bg-paper text-ink ring-1 ring-sand-300 hover:bg-sand-100",
  ghost: "text-ink-soft hover:bg-sand-100 hover:text-ink",
  danger: "bg-paper text-danger ring-1 ring-danger/30 hover:bg-danger-soft",
  "danger-solid": "bg-danger text-on-danger hover:bg-danger-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

type StyleOptions = { variant?: Variant; size?: Size; fullWidth?: boolean };

export function buttonStyles({ variant = "primary", size = "md", fullWidth = false }: StyleOptions = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

type ButtonProps = React.ComponentProps<"button"> & StyleOptions & { loading?: boolean };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & StyleOptions;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonStyles({ variant, size, fullWidth }), className)} {...props} />;
}
