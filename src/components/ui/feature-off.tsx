import Link from "next/link";
import { Illustration, type IllustrationKind } from "@/components/ui/illustrations";

/** Заглушка для страницы, блок которой выключен в настройках пары. */
export function FeatureOff({ kind, title }: { kind: IllustrationKind; title: string }) {
  return (
    <div className="mx-auto max-w-md rounded-card bg-paper p-8 text-center shadow-soft ring-1 ring-sand-200">
      <Illustration kind={kind} className="mx-auto" />
      <p className="mt-3 font-semibold">{title} отключены</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">Блок выключен в настройках пары. Данные сохранены: включите его обратно, когда захотите.</p>
      <Link href="/settings#features" className="mt-4 inline-block text-sm font-semibold text-accent-700 underline underline-offset-4">Открыть настройки</Link>
    </div>
  );
}
