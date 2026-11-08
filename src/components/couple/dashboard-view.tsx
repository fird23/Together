"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Check, Heart, RotateCcw, SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { CoupleHero } from "@/components/couple/couple-hero";
import { CalendarPreview } from "@/components/couple/calendar-preview";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { HabitsView } from "@/components/habits/habits-view";
import { MoodSelector } from "@/components/mood/mood-selector";
import { InviteManager } from "@/components/couple/invite-manager";
import { PartnersPair } from "@/components/couple/partners-pair";
import { VennBackdrop } from "@/components/couple/venn-backdrop";
import { DashboardSkeleton } from "@/components/couple/dashboard-skeleton";
import { GratitudeCard } from "@/components/gratitude/gratitude-card";
import { DashboardSection } from "@/components/couple/dashboard-section";
import { TodosPreview } from "@/components/todos/todos-preview";
import { TalkPreview } from "@/components/talk/talk-preview";
import { MemoriesCard } from "@/components/couple/memories-card";
import { WeeklySummary } from "@/components/couple/weekly-summary";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { moveBlock, reorderBlock, resetLayout, toggleCollapsed, type BlockId } from "@/lib/layout-store";
import { WelcomeTour } from "@/components/couple/welcome-tour";
import { featureOn, type FeatureKey } from "@/utils/features";
import { formatDateRu } from "@/utils/days";


export function DashboardView() {
  const { couple, profile, partner, memberCount } = useWorkspace();
  const router = useRouter();
  const layout = useDashboardLayout();
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<BlockId | null>(null);

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
          </div>
        </section>
        <InviteManager coupleId={couple.id} />
      </div>
    );
  }

  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  const blocks: Record<BlockId, { eyebrow: string; title: string; hint?: string; className: string; feature?: FeatureKey; node: React.ReactNode }> = {
    habits: { eyebrow: "МАЛЕНЬКИЕ ШАГИ К БОЛЬШИМ ПЕРЕМЕНАМ", title: "Наши привычки", hint: "Все ваши личные и общие привычки", className: "dashboard-habits-section", feature: "habits", node: <HabitsView compact /> },
    wishlist: { eyebrow: "МАЛЕНЬКИЕ РАДОСТИ И БОЛЬШИЕ МЕЧТЫ", title: "Вишлисты", hint: "Что хочется подарить и получить", className: "dashboard-wishlist-section", feature: "wishlist", node: <WishlistView /> },
    todos: { eyebrow: "ОБЩИЕ ДЕЛА И ПЛАНЫ", title: "Список дел", hint: "Что нужно сделать вам двоим", className: "dashboard-todos-section", feature: "todos", node: <TodosPreview /> },
    talk: { eyebrow: "СКАЗАТЬ, СПРОСИТЬ, ПРЕДЛОЖИТЬ", title: "Разговоры", hint: "Обращения друг к другу и ответы", className: "dashboard-talk-section", feature: "talk", node: <TalkPreview /> },
    gratitude: { eyebrow: "МАЛЕНЬКИЕ СЛОВА ВАЖНЫ", title: "Благодарности", hint: "Одна строка в день", className: "dashboard-gratitude-section", feature: "gratitude", node: <GratitudeCard /> },
    memories: { eyebrow: "ЧТО БЫЛО В ЭТОТ ДЕНЬ", title: "Воспоминания", hint: "Месяц, полгода, год назад", className: "dashboard-memories-section", feature: "memories", node: <MemoriesCard /> },
    weekly: { eyebrow: "ЗА ПОСЛЕДНИЕ 7 ДНЕЙ", title: "Итоги недели", hint: "Как прошла неделя у вас обоих", className: "dashboard-weekly-section", feature: "weekly", node: <WeeklySummary /> },
  };
  const visible = layout.order.filter((id) => !blocks[id].feature || featureOn(couple, blocks[id].feature));

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
          <section id="mood" className="dashboard-mood-section" aria-labelledby="dashboard-mood-title">
            <div className="dashboard-section-title"><div><p className="eyebrow">ЗАБОТА ДРУГ О ДРУГЕ</p><h2 id="dashboard-mood-title" className="font-serif">Настроение</h2></div></div>
            <MoodSelector compact />
          </section>
        </div>
      </div>

      {visible.length > 0 && (
        <div className="dash-layout-bar">
          <p>{editing ? "Перетащите блоки или нажимайте стрелки. Верхняя часть главной не меняется." : "Ваши блоки"}</p>
          <div>
            {editing && <button type="button" onClick={resetLayout}><RotateCcw size={14} /> Сбросить</button>}
            <button type="button" className="primary" onClick={() => setEditing((v) => !v)}>{editing ? <><Check size={14} /> Готово</> : <><SlidersHorizontal size={14} /> Настроить блоки</>}</button>
          </div>
        </div>
      )}
      {editing && <p className="dash-layout-note">Совсем убрать блок для вас обоих можно в <Link href="/settings#features">Настройки → Функции</Link>.</p>}

      {visible.map((id, index) => {
        const block = blocks[id];
        return (
          <DashboardSection
            key={id}
            id={id}
            eyebrow={block.eyebrow}
            title={block.title}
            hint={block.hint}
            className={block.className}
            collapsed={layout.collapsed.includes(id)}
            editing={editing}
            canUp={index > 0}
            canDown={index < visible.length - 1}
            dragging={dragId === id}
            onToggle={() => toggleCollapsed(id)}
            onMove={(dir) => moveBlock(id, dir, visible)}
            onDragStart={() => setDragId(id)}
            onDragEnd={() => setDragId(null)}
            onDropOn={() => { if (dragId && dragId !== id) reorderBlock(dragId, id); setDragId(null); }}
          >
            {block.node}
          </DashboardSection>
        );
      })}

      <WelcomeTour />
      <div className="dashboard-footnote"><Heart size={14} fill="currentColor" /> Маленькие моменты складываются в большую историю.</div>
    </div>
  );
}
