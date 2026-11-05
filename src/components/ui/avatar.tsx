import { cn } from "@/utils/cn";
import { avatarUrl } from "@/lib/avatar";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-20 text-2xl",
  xl: "size-28 text-3xl sm:size-32 sm:text-4xl",
};

const tones = [
  "bg-accent-100 text-accent-700",
  "bg-tone-1 text-tone-1-fg",
  "bg-tone-2 text-tone-2-fg",
  "bg-tone-3 text-tone-3-fg",
];

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return tones[hash % tones.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  /** Путь к аватару из профиля (не готовая ссылка). */
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  const common = cn("shrink-0 rounded-full", sizes[size], className);
  const url = avatarUrl(src);

  if (url) {
    // Аватары уже сжаты и лежат во внешнем хранилище, оптимизация next/image здесь не нужна.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={cn(common, "object-cover")} />;
  }
  return (
    <span role="img" aria-label={name} className={cn(common, "inline-grid place-items-center font-serif font-semibold", toneFor(name))}>
      {initial}
    </span>
  );
}
