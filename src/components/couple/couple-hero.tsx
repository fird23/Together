"use client";

import { PartnersPair } from "@/components/couple/partners-pair";
import { DayCounter } from "@/components/couple/day-counter";
import { VennBackdrop } from "@/components/couple/venn-backdrop";
import { useHeroPhotoUrl } from "@/hooks/use-hero-photo";
import { heroBlurPx } from "@/services/hero-photo";
import { DAYS_FORMS, daysTogether, describeBreakdown, formatDateRu, pluralRu } from "@/utils/days";
import type { Couple, Profile } from "@/types";

const CONFETTI = ["#E9A93B", "#D9708E", "#6C8FD6", "#6FAE6B", "#9A82C9"];

/** Круглая дата: каждые 100 дней и каждая годовщина. */
function milestoneLabel(days: number): string | null {
  if (days <= 0) return null;
  if (days % 365 === 0) { const y = days / 365; return `${y} ${pluralRu(y, ["год", "года", "лет"])} вместе`; }
  if (days % 100 === 0) return `${days} ${pluralRu(days, DAYS_FORMS)} вместе`;
  return null;
}

/** Компактная карточка пары со счётчиком дней и датой начала отношений. */
export function CoupleHero({ me, partner, couple }: { me: Profile; partner: Profile | null; couple: Couple }) {
  const days = daysTogether(couple.start_date);
  const milestone = milestoneLabel(days);
  const photoUrl = useHeroPhotoUrl(couple.hero_photo_path);
  const blurPx = heroBlurPx(couple);
  return (
    <section className={`relative isolate overflow-hidden rounded-hero bg-paper shadow-soft ring-1 ring-sand-200 dashboard-couple-card ${photoUrl ? `has-photo ${blurPx > 0 ? "photo-blur" : ""}` : ""}`}
      style={photoUrl ? ({ "--hero-blur": `${blurPx}px`, "--hero-scale": 1 + blurPx / 55 } as React.CSSProperties) : undefined}>
      <VennBackdrop className="hero-venn" />
      {photoUrl && <div className="hero-photo" style={{ backgroundImage: `url("${photoUrl}")` }} aria-hidden="true" />}
      {milestone && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ "--x": `${(i * 37 + 8) % 100}%`, "--delay": `${(i % 7) * 0.13}s`, "--dur": `${2.8 + (i % 5) * 0.4}s`, "--rot": `${(i * 53) % 360}deg`, "--c": CONFETTI[i % CONFETTI.length] } as React.CSSProperties} />
          ))}
        </div>
      )}
      <div className="relative flex flex-col items-center px-4 py-4 text-center sm:px-5 sm:py-5">
        {milestone && <p className="hero-celebrate">🎉 Сегодня {milestone}!</p>}
        <PartnersPair me={me} partner={partner} partnerName="Партнёр" />
        <p className="mt-2 font-serif text-sm text-ink sm:text-base">Мы вместе уже</p>
        <div className="dashboard-day-counter"><DayCounter days={days} /></div>
        <p className="mt-2 text-sm font-medium">С {formatDateRu(couple.start_date)}</p>
        <p className="mt-0.5 text-xs text-ink">{describeBreakdown(couple.start_date)}</p>
      </div>
    </section>
  );
}
