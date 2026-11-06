import { cn } from "@/utils/cn";

export type IllustrationKind = "habits" | "wishlist" | "calendar" | "support" | "welcome" | "todos" | "talk" | "gratitude";

/** Небольшие иллюстрации для пустых состояний. Красятся цветами текущей темы. */
export function Illustration({ kind, className }: { kind: IllustrationKind; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={cn("illustration h-24 w-32", className)} aria-hidden="true" fill="none">
      <ellipse cx="60" cy="82" rx="38" ry="4.5" className="fill-sand-200" />
      {kind === "habits" && (
        <>
          <path d="M44 58h32l-3.5 19a4 4 0 0 1-4 3.2H51.500a4 4 0 0 1-4-3.200z" className="fill-accent-200" />
          <rect x="41" y="54" width="38" height="7" rx="3.500" className="fill-accent-300" />
          <path d="M60 54V34" className="stroke-accent-600" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 44C48 44 42 37 42 28c12 0 18 6 18 16z" className="fill-accent-300" />
          <path d="M60 37c10 0 16-6 16-14-10 0-16 5-16 14z" className="fill-accent-600" />
          <circle cx="94" cy="30" r="3" className="fill-accent-200" />
          <circle cx="25" cy="40" r="2.500" className="fill-accent-300" />
        </>
      )}
      {kind === "wishlist" && (
        <>
          <rect x="36" y="42" width="48" height="36" rx="5" className="fill-accent-200" />
          <rect x="32" y="33" width="56" height="13" rx="4" className="fill-accent-300" />
          <rect x="56" y="33" width="8" height="45" className="fill-accent-600" />
          <path d="M60 33c-8-1-15-4-13-10 2-5 10-3 13 10zM60 33c8-1 15-4 13-10-2-5-10-3-13 10z" className="fill-accent-600" />
          <path d="M96 24l1.800 4.200L102 30l-4.200 1.800L96 36l-1.800-4.200L90 30l4.200-1.800z" className="fill-accent-300" />
          <circle cx="24" cy="36" r="2.500" className="fill-accent-200" />
        </>
      )}
      {kind === "calendar" && (
        <>
          <rect x="30" y="16" width="60" height="62" rx="7" className="fill-paper stroke-sand-300" strokeWidth="1.500" />
          <path d="M30 23a7 7 0 0 1 7-7h46a7 7 0 0 1 7 7v7H30z" className="fill-accent-600" />
          <rect x="43" y="11" width="4.500" height="12" rx="2.200" className="fill-accent-300" />
          <rect x="72.500" y="11" width="4.500" height="12" rx="2.200" className="fill-accent-300" />
          <path d="M60 68c-9-6.500-13.500-10.500-13.500-16a6.500 6.500 0 0 1 13.500-2.200A6.500 6.500 0 0 1 73.500 52c0 5.500-4.500 9.500-13.500 16z" className="fill-accent-300" />
        </>
      )}
      {kind === "support" && (
        <>
          <path d="M26 48 94 22 76 72 58 55z" className="fill-accent-200" />
          <path d="M58 55 94 22" className="stroke-accent-600" strokeWidth="2.500" strokeLinecap="round" />
          <path d="M58 55v15l9-9z" className="fill-accent-600" />
          <circle cx="24" cy="26" r="2.500" className="fill-accent-300" />
          <circle cx="100" cy="58" r="2" className="fill-accent-200" />
        </>
      )}
      {kind === "todos" && (
        <>
          <rect x="34" y="17" width="52" height="62" rx="7" className="fill-paper stroke-sand-300" strokeWidth="1.500" />
          <rect x="50" y="11" width="20" height="10" rx="3.500" className="fill-accent-600" />
          <path d="M42 37l3.500 3.500L52 33" className="stroke-accent-600" strokeWidth="2.500" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M42 51l3.500 3.500L52 47" className="stroke-accent-600" strokeWidth="2.500" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="42" y="62" width="9" height="9" rx="2.500" className="stroke-sand-300" strokeWidth="1.500" />
          <rect x="58" y="35" width="20" height="4" rx="2" className="fill-sand-300" />
          <rect x="58" y="49" width="20" height="4" rx="2" className="fill-sand-300" />
          <rect x="58" y="65" width="14" height="4" rx="2" className="fill-sand-300" />
        </>
      )}
      {kind === "talk" && (
        <>
          <path d="M30 20h38a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H48l-10 9v-9h-8a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" className="fill-accent-200" />
          <path d="M56 42h34a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-6v8l-9-8H56a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8z" className="fill-accent-600" />
          <circle cx="36" cy="35" r="2.500" className="fill-accent-600" /><circle cx="46" cy="35" r="2.500" className="fill-accent-600" /><circle cx="56" cy="35" r="2.500" className="fill-accent-600" />
        </>
      )}
      {kind === "gratitude" && (
        <>
          <rect x="38" y="30" width="44" height="48" rx="11" className="fill-paper stroke-sand-300" strokeWidth="1.500" />
          <rect x="43" y="20" width="34" height="11" rx="4" className="fill-accent-600" />
          <path transform="translate(47 50) scale(1.700)" d="M5 9C1 6 0 4 0 2.500a2.500 2.500 0 0 1 5-.8A2.500 2.500 0 0 1 10 2.500C10 4 9 6 5 9z" className="fill-accent-300" />
          <path transform="translate(62 58) scale(1.200)" d="M5 9C1 6 0 4 0 2.500a2.500 2.500 0 0 1 5-.8A2.500 2.500 0 0 1 10 2.500C10 4 9 6 5 9z" className="fill-accent-600" />
          <path transform="translate(60 42) scale(1)" d="M5 9C1 6 0 4 0 2.500a2.500 2.500 0 0 1 5-.8A2.500 2.500 0 0 1 10 2.500C10 4 9 6 5 9z" className="fill-accent-200" />
        </>
      )}
      {kind === "welcome" && (
        <>
          <circle cx="47" cy="46" r="26" className="fill-accent-300" />
          <circle cx="73" cy="46" r="26" className="fill-accent-600 [mix-blend-mode:var(--venn-blend)]" />
          <path d="M60 58c-7-5-10.500-8.500-10.500-12.500a5 5 0 0 1 10.500-1.800 5 5 0 0 1 10.500 1.800C70.500 49.500 67 53 60 58z" className="fill-paper" />
        </>
      )}
    </svg>
  );
}
