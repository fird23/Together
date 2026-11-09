"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { colorHex } from "@/utils/calendar";
import { HabitIcon } from "@/utils/habit-icons";
import { WEEKDAY_SHORT, completionRate, computePairStreak, computeStreak, dueToday, scheduleKind, scheduleLabel, weeklyCounts, weekdayCounts, type Schedule } from "@/utils/habit-stats";
import { pluralRu, todayISO } from "@/utils/days";
import { cn } from "@/utils/cn";
import { ChevronLeft, ChevronRight, Snowflake, BarChart2 } from "lucide-react";
import type { HabitLike } from "@/components/habits/habit-form";

export type DetailHabit = HabitLike & { id: string; owner_id: string | null };
type Mark = { habit_id: string; user_id: string; day: string };
type Person = { id: string; name: string };

const dayWord = (n: number) => pluralRu(n, ["день", "дня", "дней"]);
const weekWord = (n: number) => pluralRu(n, ["неделя", "недели", "недель"]);
const shortDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");

export function HabitDetail({ habit, checkins, freezes, me, partner, onClose, onToggleDay, onToggleFreeze, onOpenGlobalStats }: {
  habit: DetailHabit | null; 
  checkins: Mark[]; 
  freezes: Mark[]; 
  me: Person; 
  partner: Person | null; 
  onClose: () => void;
  onToggleDay?: (habitId: string, userId: string, dayIso: string) => Promise<void>;
  onToggleFreeze?: (habitId: string, userId: string, dayIso: string) => Promise<void>;
  onOpenGlobalStats?: () => void;
}) {
  return (
    <Modal open={habit !== null} onClose={onClose} title={habit?.title ?? ""} size="lg">
      {habit && <Body key={habit.id} habit={habit} checkins={checkins} freezes={freezes} me={me} partner={partner} onToggleDay={onToggleDay} onToggleFreeze={onToggleFreeze} onOpenGlobalStats={onOpenGlobalStats} />}
    </Modal>
  );
}

function Body({ habit, checkins, freezes, me, partner, onToggleDay, onToggleFreeze, onOpenGlobalStats }: { 
  habit: DetailHabit; 
  checkins: Mark[]; 
  freezes: Mark[]; 
  me: Person; 
  partner: Person | null;
  onToggleDay?: (habitId: string, userId: string, dayIso: string) => Promise<void>;
  onToggleFreeze?: (habitId: string, userId: string, dayIso: string) => Promise<void>;
  onOpenGlobalStats?: () => void;
}) {
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

  // Состояние для листания месяцев (храним текущую выбранную дату отображаемого месяца)
  const [cursorDate, setCursorDate] = useState(() => new Date(`${today}T12:00:00`));

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
  const monthKey = today.slice(0, 7);
  const freezeCount = [...frozen].filter((d) => d.startsWith(monthKey)).length;
  const label = scheduleLabel(schedule);

  const getPastIso = (daysAgo: number) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const yesterdayIso = getPastIso(1);
  const dayBeforeYesterdayIso = getPastIso(2);
  const activeUserId = view === "partner" ? partner?.id : me.id;
  const canInteract = onToggleDay && view !== "pair" && activeUserId;

  // Генерация дней для календарного месяца
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursorDate);

  const prevMonth = () => setCursorDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCursorDate(new Date(year, month + 1, 1));

  // Получаем дни месяца с отступами для правильного выравнивания по дням недели
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null); // пустые ячейки для выравнивания
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    calendarDays.push(`${year}-${mStr}-${dStr}`);
  }

  return (
    <div className="hd" style={{ "--hc": hue } as React.CSSProperties}>
      <div className="hd-head flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="hd-icon"><HabitIcon id={habit.icon} size={22} /></span>
          <div>
            <p className="font-medium text-sm">{habit.title}</p>
            <p className="text-xs text-ink-faint">{habit.scope === "shared" ? "Общая привычка" : habit.owner_id === me.id ? "Ваша личная" : `Личная · ${partner?.name}`}{label ? ` · ${label}` : " · каждый день"}</p>
          </div>
        </div>

        {/* Кнопки управления: общая статистика, вчера/позавчера, заморозка */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenGlobalStats && (
            <button
              type="button"
              onClick={onOpenGlobalStats}
              className="px-3 py-1.5 text-xs rounded-xl bg-accent-50 text-accent-700 hover:bg-accent-100 font-medium flex items-center gap-1.5 transition-all border border-accent-200"
            >
              <BarChart2 size={13} /> Общая статистика
            </button>
          )}
          {canInteract && (
            <>
              <button
                type="button"
                onClick={() => onToggleDay(habit.id, activeUserId, yesterdayIso)}
                className={cn("px-2.5 py-1 text-xs rounded-lg border transition-all", done.has(yesterdayIso) ? "bg-accent-600 text-white border-accent-600" : "bg-sand-100 hover:bg-sand-200 border-sand-300")}
              >
                {done.has(yesterdayIso) ? "✓ Вчера" : "+ Вчера"}
              </button>
              {onToggleFreeze && (
                <button
                  type="button"
                  onClick={() => onToggleFreeze(habit.id, activeUserId, yesterdayIso)}
                  title="Заморозить вчерашний день"
                  className={cn("p-1.5 text-xs rounded-lg border transition-all flex items-center gap-1", frozen.has(yesterdayIso) ? "bg-blue-500 text-white border-blue-500" : "bg-sand-100 hover:bg-sand-200 border-sand-300 text-blue-600")}
                >
                  <Snowflake size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {views.length > 1 && (
        <div className="hb-segment hd-tabs mt-3" role="tablist" aria-label="Чья статистика">
          {views.map((v) => <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? "active" : ""} onClick={() => setView(v.key)}>{v.label}</button>)}
        </div>
      )}

      {/* Карточки метрик */}
      <div className="hd-tiles grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-sand-50/60 border border-sand-200"><small className="text-[11px] text-ink-faint block">Серия сейчас</small><strong className="text-xl font-bold">{current}</strong><span className="text-xs text-ink-soft block">{pairStreak !== null || streak.unit === "days" ? dayWord(current) : weekWord(current)} подряд</span></div>
        <div className="p-3 rounded-xl bg-sand-50/60 border border-sand-200"><small className="text-[11px] text-ink-faint block">Рекорд</small><strong className="text-xl font-bold">{pairStreak !== null ? Math.max(current, computeStreak(schedule, done, frozen, today).best) : streak.best}</strong><span className="text-xs text-ink-soft block">за год</span></div>
        <div className="p-3 rounded-xl bg-sand-50/60 border border-sand-200"><small className="text-[11px] text-ink-faint block">За 30 дней</small><strong className="text-xl font-bold">{rate}%</strong><span className="text-xs text-ink-soft block">от плана</span></div>
        <div className="p-3 rounded-xl bg-sand-50/60 border border-sand-200"><small className="text-[11px] text-ink-faint block">Всего отметок</small><strong className="text-xl font-bold">{done.size}</strong><span className="text-xs text-ink-soft block">за год</span></div>
      </div>

      {freezeCount > 0 && <p className="text-xs text-blue-600 mb-3">❄ Заморозок в этом месяце: {freezeCount} из 3.</p>}

      {/* УДОБНЫЙ КАЛЕНДАРЬ МЕСЯЦА С ЛИСТАНИЕМ */}
      <div className="p-4 rounded-2xl bg-paper border border-sand-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft capitalize">{monthName}</h4>
          <div className="flex items-center gap-1">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-sand-100 text-ink-soft border border-sand-200"><ChevronLeft size={16} /></button>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-sand-100 text-ink-soft border border-sand-200"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink-faint pb-1">
          {WEEKDAY_SHORT.map((d) => <span key={d}>{d}</span>)}
        </div>

        {/* Сетка дней месяца */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((iso, idx) => {
            if (!iso) return <div key={`empty-${idx}`} />;
            const isDone = done.has(iso);
            const isFrozen = frozen.has(iso);
            const isToday = iso === today;

            return (
              <button
                key={iso}
                type="button"
                disabled={!canInteract}
                onClick={() => canInteract && onToggleDay(habit.id, activeUserId, iso)}
                title={`${iso}: ${isDone ? "Выполнено" : isFrozen ? "Заморожено" : "Пропуск"}. Нажмите, чтобы изменить.`}
                className={cn(
                  "h-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all border relative",
                  isDone ? "bg-accent-600 text-white border-accent-600 shadow-xs" :
                  isFrozen ? "bg-blue-400 text-white border-blue-400" :
                  "bg-sand-50/80 hover:bg-sand-100 text-ink border-sand-200",
                  isToday && "ring-2 ring-accent-500 ring-offset-1"
                )}
              >
                <span>{Number(iso.slice(8))}</span>
                {isDone && <span className="absolute bottom-0.5 text-[8px]">✓</span>}
                {isFrozen && <span className="absolute bottom-0.5 text-[8px]">❄</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hd-legend flex items-center gap-4 mt-3 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-xs bg-accent-600 inline-block" /> выполнено</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-xs bg-blue-400 inline-block" /> заморожено</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-xs bg-sand-200 inline-block" /> пропуск</span>
      </div>

      <div className="hd-charts grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-sand-200">
        <div>
          <h4 className="hd-title text-xs font-semibold mb-2 text-ink-soft">По неделям</h4>
          <div className="hd-bars flex items-end gap-1.5 h-20" aria-label="Отметки по неделям">
            {weeks.map((w) => (
              <div key={w.start} className="flex-1 flex flex-col items-center h-full justify-end" title={`Неделя с ${shortDate(w.start)}: ${w.count}`}>
                <span style={{ height: `${(w.count / maxWeek) * 100}%` }} className={cn("w-full rounded-t-xs bg-accent-500/80 transition-all", w.count === 0 && "h-0.5 bg-sand-300")} />
                <em className="text-[10px] text-ink-faint mt-1">{w.count}</em>
              </div>
            ))}
          </div>
          <div className="hd-bars-labels flex justify-between mt-1 text-[10px] text-ink-faint">{weeks.map((w) => <span key={w.start}>{shortDate(w.start).split(" ")[0]}</span>)}</div>
        </div>
        <div>
          <h4 className="hd-title text-xs font-semibold mb-2 text-ink-soft">По дням недели</h4>
          <div className="hd-bars flex items-end gap-1.5 h-20" aria-label="Отметки по дням недели">
            {weekdays.map((n, i) => (
              <div key={WEEKDAY_SHORT[i]} className="flex-1 flex flex-col items-center h-full justify-end" title={`${WEEKDAY_SHORT[i]}: ${n}`}>
                <span style={{ height: `${(n / maxDay) * 100}%` }} className={cn("w-full rounded-t-xs bg-accent-500/80 transition-all", n === 0 && "h-0.5 bg-sand-300")} />
                <em className="text-[10px] text-ink-faint mt-1">{n}</em>
              </div>
            ))}
          </div>
          <div className="hd-bars-labels flex justify-between mt-1 text-[10px] text-ink-faint">{WEEKDAY_SHORT.map((d) => <span key={d}>{d}</span>)}</div>
        </div>
      </div>
    </div>
  );
}