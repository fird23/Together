"use client";

import { useState } from "react";
import { Flame, Frown, Sparkles, Trophy } from "lucide-react";
import { HabitIcon } from "@/utils/habit-icons";
import { colorHex } from "@/utils/calendar";
import { dayProgress, overallStreak, recentDays } from "@/utils/habit-overview";
import { WEEKDAY_SHORT, completionRate, computePairStreak, computeStreak, weekStart } from "@/utils/habit-stats";
import { addDays } from "@/utils/days";
import type { EventColor } from "@/types";

type HabitRow = { id: string; title: string; scope: "shared" | "personal"; owner_id: string | null; icon?: string | null; color?: EventColor | null; week_days?: number[] | null; per_week?: number | null };
type Mark = { habit_id: string; user_id: string; day: string };
type Who = "me" | "partner" | "both";
type Range = 7 | 30 | 90;

const shortDay = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
const monthShort = (iso: string) => new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
const WEEKDAY_NOM = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

function Ring({ value, size = 104 }: { value: number; size?: number }) {
  const r = 42, circ = 2 * Math.PI * r;
  return (
    <div className="hx-donut" style={{ width: size, height: size }} role="img" aria-label={`Выполнено ${value}%`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="bg" />
        <circle cx="50" cy="50" r={r} className="fg" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} transform="rotate(-90 50 50)" />
      </svg>
      <span><b>{value}</b><small>%</small></span>
    </div>
  );
}

/** Статистика пары: период и «чья», кольцо выполнения, выводы, тепловая карта, недели, сравнение двоих и разбор по привычкам. */
export function HabitStatsPanel({ habits, checkins, freezes, meId, partner, today }: {
  habits: HabitRow[]; checkins: Mark[]; freezes: Mark[]; meId: string; partner: { id: string; name: string } | null; today: string;
}) {
  const [who, setWho] = useState<Who>(partner ? "both" : "me");
  const [range, setRange] = useState<Range>(30);
  const options: { key: Who; label: string }[] = [{ key: "me", label: "Вы" }, ...(partner ? [{ key: "partner" as const, label: partner.name }, { key: "both" as const, label: "Вместе" }] : [])];
  const name = (uid: string) => (uid === meId ? "Вы" : partner?.name ?? "Партнёр");

  const marksOf = (uid: string) => new Set(checkins.filter((c) => c.user_id === uid).map((c) => `${c.habit_id}:${c.day}`));
  const daysOf = (uid: string) => new Set(checkins.filter((c) => c.user_id === uid).map((c) => c.day));
  const setOf = (rows: Mark[], habitId: string, uid: string) => new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === uid).map((r) => r.day));

  const userIds = who === "me" ? [meId] : who === "partner" && partner ? [partner.id] : [meId, ...(partner ? [partner.id] : [])];
  const relevant = (h: HabitRow, uid: string) => h.scope === "shared" || h.owner_id === uid;
  const rows = habits.map((h) => ({ h, users: userIds.filter((u) => relevant(h, u)) })).filter((r) => r.users.length > 0);

  const rateOf = (h: HabitRow, uid: string, days: number) => completionRate(h, setOf(checkins, h.id, uid), today, days);
  const details = rows.map(({ h, users }) => {
    const rate = avg(users.map((u) => rateOf(h, u, range)));
    let streak: number, unit: "days" | "weeks" = "days";
    if (who === "both" && h.scope === "shared" && partner) {
      streak = computePairStreak(h, setOf(checkins, h.id, meId), setOf(checkins, h.id, partner.id), setOf(freezes, h.id, meId), setOf(freezes, h.id, partner.id), today);
    } else {
      const st = computeStreak(h, setOf(checkins, h.id, users[0]), setOf(freezes, h.id, users[0]), today);
      streak = st.current; unit = st.unit;
    }
    const dots = recentDays(h, setOf(checkins, h.id, users[0]), setOf(freezes, h.id, users[0]), today, today, 14);
    return { h, rate, streak, unit, dots };
  });

  const from = addDays(today, -(range - 1));
  const scoped = checkins.filter((c) => rows.some((r) => r.h.id === c.habit_id && r.users.includes(c.user_id)));
  const inRange = scoped.filter((c) => c.day >= from && c.day <= today);
  const total = avg(details.map((d) => d.rate));
  const activeDays = new Set(inRange.map((c) => c.day)).size;
  const bestNow = details.reduce((m, d) => Math.max(m, d.streak), 0);

  // тепловая карта: 16 недель, цвет зависит от доли выполненного в этот день
  const weeksCount = 16;
  const first = addDays(weekStart(today), -7 * (weeksCount - 1));
  const markSets = new Map(userIds.map((u) => [u, marksOf(u)]));
  const cells = Array.from({ length: weeksCount * 7 }, (_, i) => {
    const iso = addDays(first, i);
    if (iso > today) return { iso, level: -2 };
    let done = 0, tot = 0;
    for (const u of userIds) {
      const p = dayProgress(habits.filter((h) => relevant(h, u)), u, markSets.get(u)!, iso);
      done += p.done; tot += p.total;
    }
    return { iso, level: tot === 0 ? -1 : done === 0 ? 0 : done === tot ? 3 : done / tot >= 0.5 ? 2 : 1 };
  });
  // Подпись месяца ставим только там, где он меняется, и не чаще чем раз в 3 колонки, чтобы подписи не слипались
  const monthLabels = Array.from({ length: weeksCount }, (_, w) => w).reduce<{ at: number; labels: string[] }>((acc, w) => {
    const iso = addDays(first, w * 7);
    const changed = w === 0 || monthShort(iso) !== monthShort(addDays(first, (w - 1) * 7));
    const show = changed && w - acc.at >= 3;
    return { at: show ? w : acc.at, labels: [...acc.labels, show ? monthShort(iso) : ""] };
  }, { at: -9, labels: [] }).labels;

  // 8 недель, для «Вместе» столбец делится на двоих
  const weeks = 8;
  const starts = Array.from({ length: weeks }, (_, i) => addDays(weekStart(today), -7 * (weeks - 1 - i)));
  const bars = starts.map((start) => ({ start, parts: userIds.map((u) => scoped.filter((c) => c.user_id === u && c.day >= start && c.day < addDays(start, 7)).length) }));
  const barMax = Math.max(1, ...bars.map((b) => b.parts.reduce((a, c) => a + c, 0)));

  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const c of scoped) weekdays[(new Date(`${c.day}T12:00:00`).getDay() + 6) % 7]++;
  const bestDay = weekdays.some((n) => n > 0) ? weekdays.indexOf(Math.max(...weekdays)) : -1;

  const best = [...details].filter((d) => d.rate > 0).sort((a, b) => b.rate - a.rate)[0];
  const weakest = details.length > 1 ? [...details].sort((a, b) => a.rate - b.rate)[0] : null;

  // сравнение двоих
  const duel = partner ? [meId, partner.id].map((u) => {
    const mine = habits.filter((h) => relevant(h, u));
    return {
      id: u, name: name(u),
      rate: avg(mine.map((h) => rateOf(h, u, range))),
      marks: checkins.filter((c) => c.user_id === u && c.day >= from && c.day <= today && mine.some((h) => h.id === c.habit_id)).length,
      streak: overallStreak(daysOf(u), today).current,
    };
  }) : [];

  if (habits.length === 0) return <p className="hx-empty">Статистика появится, когда вы добавите первую привычку и сделаете отметку.</p>;

  return (
    <div className="hx-stats">
      <div className="hx-filters">
        {options.length > 1 && (
          <div className="hx-seg" role="tablist" aria-label="Чья статистика">
            {options.map((o) => <button key={o.key} role="tab" aria-selected={who === o.key} className={who === o.key ? "on" : ""} onClick={() => setWho(o.key)}>{o.label}</button>)}
          </div>
        )}
        <div className="hx-seg small" role="tablist" aria-label="Период">
          {([7, 30, 90] as Range[]).map((r) => <button key={r} role="tab" aria-selected={range === r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r} дн.</button>)}
        </div>
      </div>

      <section className="hx-card hx-summary">
        <Ring value={total} />
        <div className="hx-summary-text">
          <h3>Выполнение за {range} дн.</h3>
          <p>{total >= 80 ? "Отличный ритм, так держать." : total >= 50 ? "Хороший темп, есть куда расти." : total > 0 ? "Пока непросто, но маленькие шаги считаются." : "Отметок за этот период пока нет."}</p>
          <ul>
            <li><b>{inRange.length}</b><span>отметок</span></li>
            <li><b>{activeDays}</b><span>активных дней</span></li>
            <li><b><Flame size={14} aria-hidden />{bestNow}</b><span>лучшая серия</span></li>
          </ul>
        </div>
      </section>

      {(best || weakest || bestDay >= 0) && (
        <div className="hx-insights">
          {best && <div className="good"><Trophy size={16} aria-hidden /><span>Лучше всего получается<b>{best.h.title}</b><small>{best.rate}% за период</small></span></div>}
          {weakest && weakest.rate < 70 && weakest.h.id !== best?.h.id && <div className="warn"><Frown size={16} aria-hidden /><span>Больше внимания<b>{weakest.h.title}</b><small>{weakest.rate}% за период</small></span></div>}
          {bestDay >= 0 && <div className="info"><Sparkles size={16} aria-hidden /><span>Самый продуктивный день<b>{WEEKDAY_NOM[bestDay]}</b><small>по числу отметок</small></span></div>}
        </div>
      )}

      {duel.length === 2 && (
        <section className="hx-card">
          <h3 className="hx-h">Вы и {partner?.name}</h3>
          {([["Выполнение", (d: typeof duel[number]) => d.rate, "%", 100], ["Отметок", (d: typeof duel[number]) => d.marks, "", Math.max(1, duel[0].marks, duel[1].marks)], ["Серия дней", (d: typeof duel[number]) => d.streak, "", Math.max(1, duel[0].streak, duel[1].streak)]] as [string, (d: typeof duel[number]) => number, string, number][]).map(([label, get, suffix, max]) => (
            <div key={label} className="hx-duel">
              <span className="hx-duel-label">{label}</span>
              <div className="hx-duel-row"><i className="me" style={{ width: `${Math.max(4, (get(duel[0]) / max) * 100)}%` }} /><b>{get(duel[0])}{suffix}</b></div>
              <div className="hx-duel-row"><i className="pt" style={{ width: `${Math.max(4, (get(duel[1]) / max) * 100)}%` }} /><b>{get(duel[1])}{suffix}</b></div>
            </div>
          ))}
          <p className="hx-legend"><span className="me" /> вы <span className="pt" /> {partner?.name}</p>
        </section>
      )}

      <section className="hx-card">
        <h3 className="hx-h">Активность по дням</h3>
        <div className="hx-heat-wrap">
          <div className="hx-heat-days" aria-hidden="true">{["Пн", "", "Ср", "", "Пт", "", "Вс"].map((d, i) => <span key={i}>{d}</span>)}</div>
          <div>
            <div className="hx-heat-months" aria-hidden="true">{monthLabels.map((m, i) => <span key={i}>{m}</span>)}</div>
            <div className="hx-heat" role="img" aria-label="Тепловая карта активности за 16 недель">
              {cells.map((c) => <i key={c.iso} className={`l${c.level}`} title={c.level >= 0 ? shortDay(c.iso) : undefined} />)}
            </div>
          </div>
        </div>
        <p className="hx-heat-legend">меньше <i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /> больше</p>
      </section>

      <section className="hx-card">
        <h3 className="hx-h">Последние 8 недель и дни недели</h3>
        <div className="hx-bars" role="img" aria-label="Отметки по неделям">
          {bars.map((b) => {
            const sum = b.parts.reduce((a, c) => a + c, 0);
            return (
              <div key={b.start} className="hx-bar-col">
                <span className="hx-bar-val">{sum || ""}</span>
                <div className="hx-bar-stack" style={{ height: `${(sum / barMax) * 100}%` }}>
                  {b.parts.map((p, i) => p > 0 && <i key={i} className={i === 1 ? "pt" : "me"} style={{ flexGrow: p }} />)}
                </div>
                <small>{shortDay(b.start)}</small>
              </div>
            );
          })}
        </div>
        {who === "both" && partner && <p className="hx-legend"><span className="me" /> вы <span className="pt" /> {partner.name}</p>}
        {bestDay >= 0 && (
          <div className="hx-wd" aria-label="Отметки по дням недели" title="Отметки по дням недели">
            {weekdays.map((n, i) => <div key={i} className={i === bestDay ? "best" : ""}><span style={{ height: `${Math.max(8, (n / Math.max(...weekdays)) * 100)}%` }} /><small>{WEEKDAY_SHORT[i]}</small></div>)}
          </div>
        )}
      </section>

      <section className="hx-card">
        <h3 className="hx-h">По привычкам</h3>
        <ul className="hx-habit-stats">
          {[...details].sort((a, b) => b.rate - a.rate).map(({ h, rate, streak, unit, dots }) => (
            <li key={h.id} style={h.color ? ({ "--hc": colorHex(h.color) } as React.CSSProperties) : undefined}>
              <span className="hx-top-icon"><HabitIcon id={h.icon} size={15} /></span>
              <span className="hx-top-body">
                <span className="hx-top-title">{h.title}</span>
                <span className="hx-dots14" aria-hidden="true">{dots.map((d) => <i key={d.iso} className={d.state} />)}</span>
              </span>
              <span className="hx-rate"><b>{rate}%</b>{streak > 0 && <small><Flame size={11} aria-hidden />{streak}{unit === "weeks" ? " нед." : " дн."}</small>}</span>
            </li>
          ))}
        </ul>
        <p className="hx-note">Процент считается с учётом расписания каждой привычки. Точки справа от названия: последние 14 дней.</p>
      </section>
    </div>
  );
}
