import Link from "next/link";
import { cn } from "@/utils/cn";

/** Два пересекающихся круга: «мы» состоит из двоих. Тот же мотив — на главной странице пары. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 22" className={cn("h-5 w-[31px]", className)} aria-hidden>
      <circle cx="11" cy="11" r="10" className="fill-accent-300" />
      <circle cx="23" cy="11" r="10" className="fill-accent-600 [mix-blend-mode:var(--venn-blend)]" />
    </svg>
  );
}

export function Logo({ asText = false, href = "/", className }: { asText?: boolean; href?: string; className?: string }) {
  const content = (
    <>
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight">Together</span>
    </>
  );
  const classes = cn("inline-flex items-center gap-2.5 text-ink", className);
  if (asText) return <span className={classes}>{content}</span>;
  return (
    <Link href={href} className={classes} aria-label="Together, на главную">
      {content}
    </Link>
  );
}
