import { HOURS_FORMS, MONTHS_FORMS_PUBLIC, WEEKS_FORMS, pluralRu, togetherStats } from "@/utils/days";

const format = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

/** Сводка «Ваш путь»: те же дни, пересчитанные в недели, месяцы и часы. */
export function TogetherStats({ startDate }: { startDate: string }) {
  const { weeks, months, hours } = togetherStats(startDate);
  const items = [
    { value: weeks, label: pluralRu(weeks, WEEKS_FORMS) },
    { value: months, label: pluralRu(months, MONTHS_FORMS_PUBLIC) },
    { value: hours, label: pluralRu(hours, HOURS_FORMS) },
  ];
  return (
    <section className="rounded-card bg-accent-50 p-5 ring-1 ring-accent-100 sm:p-6" aria-labelledby="stats-title">
      <h2 id="stats-title" className="font-serif text-xl font-semibold">
        Ваш путь
      </h2>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {items.map(({ value, label }) => (
          <div key={label} className="flex flex-col">
            <dt className="order-2 text-sm text-ink-soft">{label}</dt>
            <dd className="font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">{format(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
