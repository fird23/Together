"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Heart,
} from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { CoupleHero } from "@/components/couple/couple-hero";
import { CalendarPreview } from "@/components/couple/calendar-preview";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { HabitsView } from "@/components/habits/habits-view";
import { MoodSelector } from "@/components/mood/mood-selector";
import { InviteManager } from "@/components/couple/invite-manager";
import { PartnersPair } from "@/components/couple/partners-pair";
import { EditStartDate } from "@/components/couple/edit-start-date";
import { VennBackdrop } from "@/components/couple/venn-backdrop";
import { DashboardSkeleton } from "@/components/couple/dashboard-skeleton";
import { formatDateRu } from "@/utils/days";


export function DashboardView() {
  const { couple, profile, partner, memberCount } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (!couple) router.replace("/couple");
  }, [couple, router]);

  if (!couple || !profile) return <DashboardSkeleton />;

  if (memberCount < 2) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="relative isolate overflow-hidden rounded-hero bg-paper shadow-soft ring-1 ring-sand-200">
          <VennBackdrop />
          <div className="relative flex flex-col items-center px-5 py-10 text-center sm:px-10 sm:py-12">
            <PartnersPair me={profile} partner={null} />
            <h1 className="mt-8 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Ждём вашего партнёра</h1>
            <p className="mt-3 max-w-md leading-relaxed text-ink">Счётчик дней и общее пространство откроются, как только партнёр примет приглашение.</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper/80 px-4 py-2 text-sm ring-1 ring-sand-200"><CalendarDays className="size-4 text-accent-600" aria-hidden />Вместе с {formatDateRu(couple.start_date)}</p>
            <div className="mt-5"><EditStartDate couple={couple} /></div>
          </div>
        </section>
        <InviteManager coupleId={couple.id} />
      </div>
    );
  }

  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="dashboard-page">
      <header className="dashboard-welcome">
        <div>
          <p className="eyebrow"><Heart size={13} fill="currentColor" /> ВАШЕ ОБЩЕЕ ПРОСТРАНСТВО</p>
          <h1 className="font-serif">Привет, {profile.display_name}</h1>
          <p>{todayLabel}. Здесь всё, что помогает вам быть ближе.</p>
        </div>
        <div className="welcome-mark" aria-hidden="true"><span>t</span><i>ogether</i></div>
      </header>

      <div className="dashboard-top-grid dashboard-top-grid-revised">
        <div className="dashboard-hero-wrap"><CoupleHero me={profile} partner={partner} couple={couple} /></div>
        <div className="dashboard-calendar-wrap"><CalendarPreview /></div>
        <div className="dashboard-mood-wrap">
          <section className="dashboard-mood-section" aria-labelledby="dashboard-mood-title">
            <div className="dashboard-section-title"><div><p className="eyebrow">ЗАБОТА ДРУГ О ДРУГЕ</p><h2 id="dashboard-mood-title" className="font-serif">Настроение</h2></div></div>
            <MoodSelector compact />
          </section>
        </div>
      </div>

      <section className="dashboard-habits-section" aria-labelledby="dashboard-habits-title">
        <div className="dashboard-section-title"><div><p className="eyebrow">МАЛЕНЬКИЕ ШАГИ К БОЛЬШИМ ПЕРЕМЕНАМ</p><h2 id="dashboard-habits-title" className="font-serif">Наши привычки</h2></div><span>Все ваши личные и общие привычки</span></div>
        <HabitsView compact />
      </section>

      <section className="dashboard-wishlist-section" aria-labelledby="dashboard-wishlist-title">
        <div className="dashboard-section-title"><div><p className="eyebrow">МАЛЕНЬКИЕ РАДОСТИ И БОЛЬШИЕ МЕЧТЫ</p><h2 id="dashboard-wishlist-title" className="font-serif">Вишлисты</h2></div><span>Что хочется подарить и получить</span></div>
        <WishlistView />
      </section>
      <div className="dashboard-footnote"><Heart size={14} fill="currentColor" /> Маленькие моменты складываются в большую историю.</div>
    </div>
  );
}
