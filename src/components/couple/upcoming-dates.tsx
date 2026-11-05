import { CalendarDays, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DAYS_FORMS, formatDateRu, pluralRu, upcomingDates } from "@/utils/days";
import { cn } from "@/utils/cn";

function whenText(inDays: number) {
  if (inDays === 0) return "Сегодня";
  if (inDays === 1) return "Завтра";
  return `Через ${inDays} ${pluralRu(inDays, DAYS_FORMS)}`;
}

function DateBadge({ iso, highlight }: { iso: string; highlight: boolean }) {
  const [, month, day] = iso.split("-").map(Number);
  const short = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, month - 1, 1)))
    .replace(".", "");
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center rounded-control leading-none",
        highlight ? "bg-accent-600 text-on-accent" : "bg-accent-100 text-accent-700",
      )}
    >
      <span className="font-serif text-lg font-semibold">{day}</span>
      <span className="mt-0.5 text-[11px] uppercase tracking-wide">{short}</span>
    </span>
  );
}

/** Ближайшие памятные даты пары: круглые числа дней, полгода и годовщины. */
export function UpcomingDates({ startDate }: { startDate: string }) {
  const dates = upcomingDates(startDate, new Date(), 4);
  return (
    <Card>
      <h2 className="flex items-center gap-2.5 font-serif text-xl font-semibold">
        <CalendarDays className="size-5 text-accent-600" aria-hidden /> Ближайшие даты
      </h2>
      <ol className="mt-4 divide-y divide-sand-200">
        {dates.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
            <DateBadge iso={item.date} highlight={index === 0} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-ink-soft">
                {whenText(item.inDays)}, {formatDateRu(item.date)}
              </p>
            </div>
            {item.kind === "anniversary" && <Sparkles className="size-4 shrink-0 text-accent-600" aria-label="Годовщина" />}
          </li>
        ))}
      </ol>
    </Card>
  );
}
