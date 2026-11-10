"use client";

import { Flame, Heart, Snowflake } from "lucide-react";
import { MEDALS, nextMilestone, prevMilestone } from "@/utils/habit-overview";
import { pluralRu } from "@/utils/days";

const dayWord = (n: number) => pluralRu(n, ["день", "дня", "дней"]);
const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

/**
 * Главная карточка серий: пламя и число дней подряд, серия каждого и общая серия пары, медали.
 * Всё считается по дням, когда отмечена хотя бы одна привычка.
 */
export function HabitStreakCard({ current, best, partner, pair, meName }: {
  current: number; best: number; meName: string;
  partner: { name: string; current: number } | null; pair: number;
}) {
  const headline = partner ? Math.max(pair, 0) : current;
  const lit = headline > 0;
  const bestForMedals = Math.max(best, current);
  const next = nextMilestone(headline);
  const base = prevMilestone(headline);
  const progress = next ? Math.round(((headline - base) / (next - base)) * 100) : 100;

  return (
    <section className={`hx-hero2 ${lit ? "is-lit" : ""}`} aria-label="Серия">
      <div className="hx-hero2-top">
        <div className="hx-flame" aria-hidden="true"><Flame size={40} strokeWidth={2.1} /></div>
        <div className="hx-hero2-main">
          <span className="hx-hero2-kicker">{partner ? "Серия пары" : "Ваша серия"}</span>
          <div className="hx-hero2-num"><strong>{headline}</strong><span>{lit ? `${dayWord(headline)} в серии` : "дней"}</span></div>
          <p>{lit ? (partner ? "дней, когда вы оба отмечали привычки" : "дней, когда вы отмечали привычки") : "Отметьте любую привычку: серия начнётся сегодня"}</p>
        </div>
      </div>

      <div className={`hx-who3 ${partner ? "" : "solo"}`}>
        <div><i>{initial(meName)}</i><span>Вы</span><b><Flame size={13} aria-hidden />{current}</b></div>
        {partner && <div className="is-pair"><i><Heart size={14} aria-hidden /></i><span>Вместе</span><b>{pair}</b></div>}
        {partner && <div><i className="pt">{initial(partner.name)}</i><span>{partner.name}</span><b><Flame size={13} aria-hidden />{partner.current}</b></div>}
        <div className="rec"><span>Рекорд</span><b>{best}</b></div>
      </div>

      <div className="hx-medals" aria-label="Медали за серию">
        {MEDALS.map((m) => {
          const got = bestForMedals >= m;
          const isNext = !got && m === next;
          return <div key={m} className={`hx-medal ${got ? "got" : ""} ${isNext ? "next" : ""}`} title={`${m} ${dayWord(m)} подряд`}><b>{m}</b><small>{dayWord(m)}</small></div>;
        })}
      </div>
      {next ? (
        <div className="hx-goal2">
          <div className="hx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
          <p>До медали «{next} {dayWord(next)}» осталось {next - headline}</p>
        </div>
      ) : <p className="hx-goal2-done">Все медали собраны 🏆</p>}
      <p className="hx-freeze-note"><Snowflake size={12} aria-hidden /> Пропущенные дни замораживаются сами, серия не рвётся. Она сгорает, только если целый месяц нет ни одной отметки.</p>
    </section>
  );
}
