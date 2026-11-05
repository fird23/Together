import { DAYS_FORMS, nextMilestone, pluralRu } from "@/utils/days";

/** Сколько осталось до ближайшей круглой даты или годовщины. */
export function MilestoneBar({ days }: { days: number }) {
  const { target, previous, remaining, label } = nextMilestone(days);
  const percent = Math.max(2, Math.min(100, ((days - previous) / (target - previous)) * 100));

  return (
    <div className="mt-8 w-full max-w-sm">
      <p className="text-sm text-ink">
        Через {remaining} {pluralRu(remaining, DAYS_FORMS)} будет {label} вместе
      </p>
      <div
        role="progressbar"
        aria-label={`Путь до ${label}`}
        aria-valuemin={previous}
        aria-valuemax={target}
        aria-valuenow={days}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sand-200"
      >
        <div className="h-full rounded-full bg-accent-600 transition-[width] duration-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
