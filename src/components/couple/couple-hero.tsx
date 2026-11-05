import { PartnersPair } from "@/components/couple/partners-pair";
import { DayCounter } from "@/components/couple/day-counter";
import { daysTogether, describeBreakdown, formatDateRu } from "@/utils/days";
import type { Couple, Profile } from "@/types";

/** Компактная карточка пары со счётчиком дней и датой начала отношений. */
export function CoupleHero({ me, partner, couple }: { me: Profile; partner: Profile | null; couple: Couple }) {
  const days = daysTogether(couple.start_date);
  return (
    <section className="relative isolate overflow-hidden rounded-hero bg-paper shadow-soft ring-1 ring-sand-200 dashboard-couple-card">
      <div className="relative flex flex-col items-center px-4 py-4 text-center sm:px-5 sm:py-5">
        <PartnersPair me={me} partner={partner} partnerName="Партнёр" />
        <p className="mt-2 font-serif text-sm text-ink sm:text-base">Мы вместе уже</p>
        <div className="dashboard-day-counter"><DayCounter days={days} /></div>
        <p className="mt-2 text-sm font-medium">С {formatDateRu(couple.start_date)}</p>
        <p className="mt-0.5 text-xs text-ink">{describeBreakdown(couple.start_date)}</p>
      </div>
    </section>
  );
}
