"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { colorHex } from "@/utils/calendar";
import { HabitIcon } from "@/utils/habit-icons";
import { WEEKDAY_SHORT, completionRate, computePairStreak, computeStreak, dueToday, heatmap, scheduleKind, scheduleLabel, weekdayCounts, weeklyCounts, type Schedule } from "@/utils/habit-stats";
import { pluralRu, todayISO } from "@/utils/days";
import { cn } from "@/utils/cn";
import type { HabitLike } from "@/components/habits/habit-form";

export type DetailHabit = HabitLike & { id: string; owner_id: string | null };
type Mark = { habit_id: string; user_id: string; day: string };
type Person = { id: string; name: string };

const dayWord = (n: number) => pluralRu(n, ["день", "дня", "дней"]);
const weekWord = (n: number) => pluralRu(n, ["неделя", "недели", "недель"]);
const shortDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");

/** Подробная статистика привычки: серии, процент выполнения, календарь за полгода, недели и дни недели. */
export function HabitDetail({ habit, checkins, freezes, me, partner, onClose }: {
  habit: DetailHabit | null; checkins: Mark[]; freezes: Mark[]; me: Person; partner: Person | null; onClose: () => void;
}) {
  return (
    <Modal open={habit !== null} onClose={onClose} title={habit?.title ?? ""} size="lg">
      {habit && <Body key={habit.id} habit={habit} checkins={checkins} freezes={freezes} me={me} partner={partner} />}
    </Modal>
  );
}

function Body({ habit, checkins, freezes, me, partner }: { habit: DetailHabit; checkins: Mark[]; freezes: Mark[]; me: Person; partner: Person | null }) {
  const today = todayISO();
  const schedule: Schedule = habit;
  const kind = scheduleKind(schedule);
  const hue = habit.color ? colorHex(habit.color) : "var(--c-accent-600)";

  const views: { key: string; label: string }[] = [];
  const mineVisible = habit.scope === "shared" || habit.owner_id === me.id;
  if (mineVisible) views.push({ key: "me", label: "Вы" });
  if (partner && (habit.scope === "shared" || habit.owner_id === partner.id)) views.push({ key: "partner", label: partner.name });
  if (habit.scope === "shared" && partner) views.push({ key: "pair", label: "Вместе" });
  const [view, setView] = useState(views[0]?.key ?? "me");

  const setOf = (rows: Mark[], uid: string) => new Set(rows.filter((r) => r.habit_id === habit.id && r.user_id === uid).map((r) => r.day));
  const meDone = setOf(checkins, me.id), meFrozen = setOf(freezes, me.id);
  const pDone = partner ? setOf(checkins, partner.id) : new Set<string>();
  const pFrozen = partner ? setOf(freezes, partner.id) : new Set<string>();

  let done: Set<string>, frozen: Set<string>;
  if (view === "pair") {
    done = new Set([...meDone].filter((d) => pDone.has(d)));
    frozen = new Set([...new Set([...meDone, ...meFrozen])].filter((d) => (pDone.has(d) || pFrozen.has(d)) && !done.has(d)));
  } else if (view === "partner") { done = pDone; frozen = pFrozen; } else { done = meDone; frozen = meFrozen; }

  const streak = computeStreak(schedule, done, frozen, today);
  const pairStreak = view === "pair" ? computePairStreak(schedule, meDone, pDone, meFrozen, pFrozen, today) : null;
  const current = pairStreak ?? streak.current;
  const rate = completionRate(schedule, done, today, 30);
  const week = dueToday(schedule, done, today);
  const weeks = weeklyCounts(done, today, 8);
  const weekdays = weekdayCounts(done);
  const maxWeek = Math.max(1, kind === "count" ? schedule.per_week ?? 1 : 7, ...weeks.map((w) => w.count));
  const maxDay = Math.max(1, ...weekdays);
  const cells = heatmap(schedule, done, frozen, today, 26);
  const monthKey = today.slice(0, 7);
  const freezeCount = [...frozen].filter((d) => d.startsWith(monthKey)).length;
  const label = scheduleLabel(schedule);

  return (
    <div className="hd" style={{ "--hc": hue } as React.CSSProperties}>
      <div className="hd-head">
        <span className="hd-icon"><HabitIcon id={habit.icon} size={22} /></span>
        <p>{habit.scope === "shared" ? "Общая привычка" : habit.owner_id === me.id ? "Ваша личная привычка" : `Личная привычка · ${partner?.name ?? "партнёр"}`}{label ? ` · ${label}` : " · каждый день"}</p>
      </div>

      {views.length > 1 && (
        <div className="hb-segment hd-tabs" role="tablist" aria-label="Чья статистика">
          {views.map((v) => <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? "active" : ""} onClick={() => setView(v.key)}>{v.label}</button>)}
        </div>
      )}

      <div className="hd-tiles">
        <div><small>Серия сейчас</small><strong>{current}</strong><span>{pairStreak !== null || streak.unit === "days" ? dayWord(current) : weekWord(current)} подряд</span></div>
        <div><small>Рекорд</small><strong>{pairStreak !== null ? Math.max(current, computeStreak(schedule, done, frozen, today).best) : streak.best}</strong><span>за последний год</span></div>
        <div><small>За 30 дней</small><strong>{rate}%</strong><span>от плана</span></div>
        <div><small>Всего отметок</small><strong>{done.size}</strong><span>за последний год</span></div>
      </div>

      {kind === "count" && view !== "pair" && (
        <p className="hd-note">На этой неделе: <b>{week.weekDone}</b> из {schedule.per_week}.{week.weekDone >= (schedule.per_week ?? 1) ? " Норма выполнена 🎉" : ""}</p>
      )}
      {freezeCount > 0 && view !== "pair" && <p className="hd-note">❄ Заморозок в этом месяце: {freezeCount} из 3.</p>}

      <h4 className="hd-title">Последние полгода</h4>
      <div className="hd-heat-wrap">
        <div className="hd-heat" role="img" aria-label="Календарь выполнения за последние 26 недель">
          {cells.map((c) => <i key={c.iso} className={c.state} title={`${shortDate(c.iso)}: ${c.state === "done" ? "выполнено" : c.state === "frozen" ? "заморожено" : c.state === "off" ? "не по расписанию" : c.state === "miss" ? "пропуск" : ""}`} />)}
        </div>
      </div>
      <div className="hd-legend"><span><i className="done" /> выполнено</span><span><i className="frozen" /> заморожено</span><span><i className="miss" /> пропуск</span>{kind === "days" && <span><i className="off" /> не по расписанию</span>}</div>

      <div className="hd-charts">
        <div>
          <h4 className="hd-title">По неделям</h4>
          <div className="hd-bars" aria-label="Отметки по неделям">
            {weeks.map((w) => (
              <div key={w.start} title={`Неделя с ${shortDate(w.start)}: ${w.count}`}>
                <span style={{ height: `${(w.count / maxWeek) * 100}%` }} className={cn(w.count === 0 && "zero")} />
                <em>{w.count}</em>
              </div>
            ))}
          </div>
          <div className="hd-bars-labels">{weeks.map((w) => <small key={w.start}>{shortDate(w.start).split(" ")[0]}</small>)}</div>
        </div>
        <div>
          <h4 className="hd-title">По дням недели</h4>
          <div className="hd-bars" aria-label="Отметки по дням недели">
            {weekdays.map((n, i) => (
              <div key={WEEKDAY_SHORT[i]} title={`${WEEKDAY_SHORT[i]}: ${n}`}>
                <span style={{ height: `${(n / maxDay) * 100}%` }} className={cn(n === 0 && "zero")} />
                <em>{n}</em>
              </div>
            ))}
          </div>
          <div className="hd-bars-labels">{WEEKDAY_SHORT.map((d) => <small key={d}>{d}</small>)}</div>
        </div>
      </div>
    </div>
  );
}
