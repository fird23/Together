"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Check, ChevronRight, Flame, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { RowMenu } from "@/components/ui/row-menu";
import { ConfettiBurst } from "@/components/ui/confetti";
import { HabitDetail } from "@/components/habits/habit-detail";
import { HabitEditModal, HabitStyleFields, emptyDraft, scheduleColumns, targetColumns, validateDraft, type HabitDraft } from "@/components/habits/habit-form";
import { HabitProgressModal, fmtAmount } from "@/components/habits/habit-progress-modal";
import { colorHex } from "@/utils/calendar";
import { HabitIcon } from "@/utils/habit-icons";
import { computeStreak, dueToday, scheduleKind, scheduleLabel } from "@/utils/habit-stats";
import type { EventColor } from "@/types";
import { featureOn } from "@/utils/features";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { useRealtime } from "@/hooks/use-realtime";
import { Modal } from "@/components/ui/modal";
import { HabitStreakCard } from "@/components/habits/habit-streak-card";
import { HabitStatsPanel } from "@/components/habits/habit-stats-panel";
import { HabitWeekStrip } from "@/components/habits/habit-week-strip";
import { dayProgress, overallStreak, pairOverallStreak, recentDays } from "@/utils/habit-overview";

type Habit = {
  id: string; couple_id: string; owner_id: string | null; scope: "shared" | "personal"; title: string; created_at: string;
  color?: EventColor | null; icon?: string | null; week_days?: number[] | null; per_week?: number | null;
  target_value?: number | null; unit?: string | null;
};
type Progress = { habit_id: string; user_id: string; day: string; value: number };
type Checkin = { habit_id: string; user_id: string; day: string };
type Freeze = { habit_id: string; user_id: string; day: string };

function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const setOf = (rows: { habit_id: string; user_id: string; day: string }[], habitId: string, uid: string) =>
  new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === uid).map((r) => r.day));

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 27, circ = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <div className={`hb-ring ${total > 0 && done === total ? "is-complete" : ""}`} role="img" aria-label={`Выполнено ${done} из ${total}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="hb-ring-bg" />
        <circle cx="32" cy="32" r={r} className="hb-ring-fg" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} transform="rotate(-90 32 32)" />
      </svg>
      <span>{done}<small>/{total}</small></span>
    </div>
  );
}

/** Кружок привычки с числом: кольцо показывает долю нормы, внутри плюс, проценты или галочка. */
function NumRing({ frac, done }: { frac: number; done: boolean }) {
  const r = 19, circ = 2 * Math.PI * r;
  return (
    <>
      <svg className="num-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} className="bg" />
        <circle cx="22" cy="22" r={r} className="fg" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} transform="rotate(-90 22 22)" />
      </svg>
      {done ? <Check size={20} /> : frac > 0 ? <b>{Math.round(frac * 100)}%</b> : <Plus size={18} />}
    </>
  );
}

const initial = (name?: string) => (name?.trim()[0] ?? "?").toUpperCase();

export function HabitsView({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [freezes, setFreezes] = useState<Freeze[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [progressModal, setProgressModal] = useState<{ habit: Habit; day: string } | null>(null);
  const [celebrate, setCelebrate] = useState<{ kind: "first" | "all"; id: number } | null>(null);
  const celebrateSeq = useRef(0);
  const [draft, setDraft] = useState<HabitDraft>(emptyDraft);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [tab, setTab] = useState<"today" | "stats">("today");
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => localISO());
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = localISO();

  const load = useCallback(async (silent = false) => {
    if (!supabase || !couple || !profile) return;
    if (!silent) setLoading(true);
    setError("");
    const { data: habitRows, error: habitError } = await supabase.from("habits").select("*").eq("couple_id", couple.id).order("created_at", { ascending: false });
    if (habitError) { setError("Не удалось загрузить привычки."); setLoading(false); return; }
    const list = (habitRows ?? []) as Habit[];
    setHabits(list);
    if (list.length) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 365);
      const { data: marks, error: marksError } = await supabase.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", list.map((h) => h.id)).gte("day", localISO(cutoff));
      if (marksError) setError("Привычки загружены, но отметки пока недоступны.");
      setCheckins((marks ?? []) as Checkin[]);
      const { data: frozen, error: freezeError } = await supabase.from("habit_freezes").select("habit_id,user_id,day").in("habit_id", list.map((h) => h.id)).gte("day", localISO(cutoff));
      setFreezes(freezeError ? [] : ((frozen ?? []) as Freeze[]));
      // Числа за день для привычек с нормой. Если миграция 023 ещё не применена, просто нет данных.
      const since = new Date(); since.setDate(since.getDate() - 120);
      const { data: prog, error: progError } = await supabase.from("habit_progress").select("habit_id,user_id,day,value").in("habit_id", list.map((h) => h.id)).gte("day", localISO(since));
      setProgress(progError ? [] : ((prog ?? []) as Progress[]).map((p) => ({ ...p, value: Number(p.value) })));
    } else { setCheckins([]); setFreezes([]); setProgress([]); }
    setLoading(false);
  }, [couple, profile]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("habits", () => load(true), { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });
  useRealtime("habit_checkins", () => load(true), { enabled: Boolean(couple) });
  useRealtime("habit_freezes", () => load(true), { enabled: Boolean(couple) });
  useRealtime("habit_progress", () => load(true), { enabled: Boolean(couple) });

  const progressMap = useMemo(() => new Map(progress.map((p) => [`${p.habit_id}:${p.user_id}:${p.day}`, p.value])), [progress]);
  const todayDone = useMemo(() => new Set(checkins.filter((c) => c.day === today).map((c) => `${c.habit_id}:${c.user_id}`)), [checkins, today]);

  const createHabit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !couple || !profile) return;
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("habits").insert({
      couple_id: couple.id, owner_id: draft.scope === "personal" ? profile.id : null,
      scope: draft.scope, title: draft.title.trim(), color: draft.color, icon: draft.icon, ...scheduleColumns(draft), ...(draft.kind === "number" ? targetColumns(draft) : {}),
    });
    if (insertError) setError(draft.kind === "number" ? "Не удалось создать привычку с числом. Проверьте, что применена миграция 023_habit_targets_and_moods.sql." : "Не удалось создать привычку.");
    else { setDraft(emptyDraft()); setShowAdd(false); await load(); }
    setSaving(false);
  };

  /** Конфетти за первую отметку дня и за все привычки дня (только для своих отметок за сегодня). */
  const celebrateFor = (habitId: string, userId: string, dayStr: string) => {
    if (userId !== profile?.id || dayStr !== today) return;
    const mineIds = habits.filter((h) => (h.scope === "shared" || h.owner_id === userId) && dueToday(h, setOf(checkins, h.id, userId), today).due).map((h) => h.id);
    const before = mineIds.filter((id) => todayDone.has(`${id}:${userId}`)).length;
    if (!mineIds.includes(habitId)) return;
    celebrateSeq.current += 1;
    if (before + 1 === mineIds.length) setCelebrate({ kind: "all", id: celebrateSeq.current });
    else if (before === 0) setCelebrate({ kind: "first", id: celebrateSeq.current });
  };

  const toggleDayCheck = async (habitId: string, userId: string, dayStr: string) => {
    if (!supabase) return;
    const habit = habits.find((h) => h.id === habitId);
    // Привычка с нормой отмечается числом, а не галочкой: открываем ввод числа
    if (habit?.target_value) { setDetail(null); setProgressModal({ habit, day: dayStr }); return; }
    const isChecked = checkins.some((c) => c.habit_id === habitId && c.user_id === userId && c.day === dayStr);
    setError("");
    if (isChecked) {
      const { error: deleteError } = await supabase.from("habit_checkins").delete().eq("habit_id", habitId).eq("user_id", userId).eq("day", dayStr);
      if (deleteError) setError("Не удалось снять отметку.");
      else setCheckins((old) => old.filter((c) => !(c.habit_id === habitId && c.user_id === userId && c.day === dayStr)));
    } else {
      const { error: insertError } = await supabase.from("habit_checkins").insert({ habit_id: habitId, user_id: userId, day: dayStr });
      if (insertError) setError("Не удалось сохранить отметку.");
      else {
        celebrateFor(habitId, userId, dayStr);
        setCheckins((old) => [...old, { habit_id: habitId, user_id: userId, day: dayStr }]);
      }
    }
  };

  /** Сохраняет число за день: база сама ставит или снимает отметку «выполнено» по норме. */
  const saveProgress = async (habit: Habit, dayStr: string, value: number) => {
    if (!supabase || !profile) return;
    const { data, error: rpcError } = await supabase.rpc("set_habit_progress", { p_habit: habit.id, p_day: dayStr, p_value: value });
    if (rpcError) throw new Error("progress failed");
    const reached = data === true;
    const same = (r: { habit_id: string; user_id: string; day: string }) => r.habit_id === habit.id && r.user_id === profile.id && r.day === dayStr;
    const wasDone = checkins.some(same);
    setProgress((old) => (value > 0 ? [...old.filter((r) => !same(r)), { habit_id: habit.id, user_id: profile.id, day: dayStr, value }] : old.filter((r) => !same(r))));
    setCheckins((old) => (reached ? [...old.filter((r) => !same(r)), { habit_id: habit.id, user_id: profile.id, day: dayStr }] : old.filter((r) => !same(r))));
    if (reached && !wasDone) celebrateFor(habit.id, profile.id, dayStr);
  };

  const yesterday = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 1); return localISO(d); })();

  const saveEdit = async (id: string, d: HabitDraft) => {
    if (!supabase) return;
    const hadTarget = Boolean(habits.find((h) => h.id === id)?.target_value);
    const { error: updateError } = await supabase.from("habits").update({ title: d.title.trim(), color: d.color, icon: d.icon, ...scheduleColumns(d), ...(d.kind === "number" || hadTarget ? targetColumns(d) : {}) }).eq("id", id);
    if (updateError) throw new Error("update failed");
    await load(true);
  };

  const remove = async (habit: Habit) => {
    if (!supabase || !window.confirm(`Удалить привычку «${habit.title}» и её историю?`)) return;
    const { error: deleteError } = await supabase.from("habits").delete().eq("id", habit.id);
    if (deleteError) setError("Не удалось удалить привычку."); else await load();
  };

  if (!couple || !profile) return null;
  if (!featureOn(couple, "habits")) return null;

  const partnerName = partner?.display_name ?? "Партнёр";
  const shared = habits.filter((h) => h.scope === "shared");
  const mine = habits.filter((h) => h.scope === "personal" && h.owner_id === profile.id);
  const theirs = partner ? habits.filter((h) => h.scope === "personal" && h.owner_id === partner.id) : [];
  const visibleCount = shared.length + mine.length + theirs.length;

  const myDays = new Set(checkins.filter((c) => c.user_id === profile.id).map((c) => c.day));
  const partnerDays = partner ? new Set(checkins.filter((c) => c.user_id === partner.id).map((c) => c.day)) : null;
  const overall = overallStreak(myDays, today);
  const partnerOverall = partnerDays ? overallStreak(partnerDays, today) : null;
  const pair = partnerDays ? pairOverallStreak(myDays, partnerDays, today) : 0;

  const day = selectedDay;
  const isToday = day === today;
  const dayDone = new Set(checkins.filter((c) => c.day === day).map((c) => `${c.habit_id}:${c.user_id}`));
  const myMarks = new Set(checkins.filter((c) => c.user_id === profile.id).map((c) => `${c.habit_id}:${c.day}`));
  const progressOn = (iso: string) => dayProgress(habits, profile.id, myMarks, iso);
  const dayStat = progressOn(day);
  const labelFor = (iso: string) => (iso === today ? "Сегодня" : iso === yesterday ? "Вчера" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)));
  const dayLabel = labelFor(day);

  const renderRow = (habit: Habit) => {
    const isTheirs = habit.scope === "personal" && habit.owner_id !== profile.id;
    const owner = isTheirs ? partner : profile;
    const done = !!owner && dayDone.has(`${habit.id}:${owner.id}`);
    const ownerSet = owner ? setOf(checkins, habit.id, owner.id) : new Set<string>();
    const ownerFrozen = owner ? setOf(freezes, habit.id, owner.id) : new Set<string>();
    const due = dueToday(habit, ownerSet, day);
    const kind = scheduleKind(habit);
    const label = scheduleLabel(habit);
    const streak = computeStreak(habit, ownerSet, ownerFrozen, today);
    const hue = habit.color ? colorHex(habit.color) : undefined;
    const isNum = Boolean(habit.target_value);
    const target = Number(habit.target_value ?? 0);
    const amount = owner ? progressMap.get(`${habit.id}:${owner.id}:${day}`) ?? 0 : 0;
    const frac = isNum && target > 0 ? Math.min(1, amount / target) : 0;
    const amountText = isNum ? `${fmtAmount(amount)} из ${fmtAmount(target)}${habit.unit ? ` ${habit.unit}` : ""}` : null;
    const sub = !due.due && !done ? (kind === "count" ? "Норма недели выполнена" : "В этот день не по расписанию")
      : kind === "count" ? `${label} · ${due.weekDone}/${habit.per_week} на неделе` : label ?? "Каждый день";
    const partnerOn = habit.scope === "shared" && partner ? dayDone.has(`${habit.id}:${partner.id}`) : null;
    const dots = recentDays(habit, ownerSet, ownerFrozen, day, today, 7);
    const menu = [
      { label: "Статистика", icon: BarChart3, onClick: () => setDetail(habit) },
      ...(!isTheirs ? [
        { label: "Изменить", icon: Pencil, onClick: () => setEditing(habit) },
        { label: "Удалить", icon: Trash2, danger: true, onClick: () => void remove(habit) },
      ] : []),
    ];
    return (
      <li key={habit.id} className={`hx-row2 ${done ? "is-done" : ""} ${!due.due && !done ? "not-due" : ""}`} style={hue ? ({ "--hc": hue } as React.CSSProperties) : undefined}>
        <button type="button" className="hx-main" onClick={() => setDetail(habit)} aria-label={`Статистика: ${habit.title}`}>
          <span className="hx-icon big" aria-hidden="true"><HabitIcon id={habit.icon} size={22} /></span>
          <span className="hx-text">
            <strong>{habit.title}</strong>
            <small>
              {streak.current > 0 && <span className="hx-streak-chip"><Flame size={12} aria-hidden />{streak.current}</span>}
              {amountText && <b className={`hx-amount ${done ? "ok" : ""}`}>{amountText}</b>}
              <span>{sub}</span>
              {partnerOn !== null && <span className={`hx-pchip ${partnerOn ? "on" : ""}`} title={`${partnerName}: ${partnerOn ? "выполнено" : "не выполнено"}`}>{initial(partnerName)}{partnerOn ? " ✓" : ""}</span>}
            </small>
            <span className="hx-dots7" aria-hidden="true">{dots.map((d) => <i key={d.iso} className={d.state} />)}</span>
          </span>
        </button>
        {isTheirs ? (
          <span className={`hx-check2 is-static ${isNum ? "hx-num" : ""} ${done ? "checked" : ""}`} title={done ? `${partnerName} выполнил(а)` : amountText ? `${partnerName}: ${amountText}` : `${partnerName} ещё не отметил(а)`}>
            {isNum ? <NumRing frac={frac} done={done} /> : done && <Check size={22} />}
          </span>
        ) : isNum ? (
          <button type="button" onClick={() => setProgressModal({ habit, day })} className={`hx-check2 hx-num ${done ? "checked" : ""}`}
            aria-label={`Ввести число: ${habit.title}. Сейчас ${amountText}`}>
            <NumRing frac={frac} done={done} />
          </button>
        ) : (
          <button type="button" onClick={() => void toggleDayCheck(habit.id, profile.id, day)} aria-pressed={done}
            aria-label={done ? `Снять отметку: ${habit.title}` : `Отметить: ${habit.title}`} className={`hx-check2 ${done ? "checked" : ""}`}>
            <Check size={22} />
          </button>
        )}
        {!isTheirs && (
          <span className="hb-actions hx-actions">
            <button type="button" aria-label={`Изменить: ${habit.title}`} title="Изменить" onClick={() => setEditing(habit)}><Pencil size={16} /></button>
            <button type="button" className="danger" aria-label={`Удалить: ${habit.title}`} title="Удалить" onClick={() => void remove(habit)}><Trash2 size={16} /></button>
          </span>
        )}
        <RowMenu label={habit.title} items={menu} />
      </li>
    );
  };

  /** Фильтр «На день» оставляет то, что запланировано на выбранный день или уже отмечено; невыполненные идут первыми. */
  const ownerOf = (h: Habit) => (h.scope === "personal" && h.owner_id !== profile.id ? partner : profile);
  const isDone = (h: Habit) => { const o = ownerOf(h); return !!o && dayDone.has(`${h.id}:${o.id}`); };
  const isDue = (h: Habit) => { const o = ownerOf(h); return dueToday(h, o ? setOf(checkins, h.id, o.id) : new Set<string>(), day).due; };
  const visibleIn = (list: Habit[]) => {
    const shown = filter === "all" ? list : list.filter((h) => isDue(h) || isDone(h));
    return [...shown].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
  };

  const groups = [
    { key: "shared", label: "Вместе", list: shared },
    { key: "mine", label: "Мои", list: mine },
    { key: "theirs", label: `Личные · ${partnerName}`, list: theirs },
  ].map((g) => ({ ...g, shown: visibleIn(g.list) })).filter((g) => g.list.length > 0);
  const shownTotal = groups.reduce((n, g) => n + g.shown.length, 0);

  const dayCard = (
    <section className="hx-daycard" aria-label="День">
      <div className="hx-daycard-top">
        <ProgressRing done={dayStat.done} total={dayStat.total} />
        <div className="hx-hero-text">
          <span>{dayLabel}</span>
          <strong>{dayStat.total === 0 ? "Привычек на этот день нет" : dayStat.done === dayStat.total ? "Всё сделано 🎉" : `Осталось: ${dayStat.total - dayStat.done}`}</strong>
          {!isToday && <small className="hx-past">Можно поправить отметки за прошлые дни</small>}
          {compact && overall.current > 0 && <small className="hx-hero-streak"><Flame size={12} aria-hidden /> {overall.current} дн. подряд</small>}
        </div>
        <button type="button" className="hx-add" onClick={() => setShowAdd(true)}><Plus size={16} aria-hidden /><span>Новая</span></button>
      </div>
      {!compact && <HabitWeekStrip today={today} selected={day} onSelect={setSelectedDay} weekOffset={weekOffset} onWeekOffset={(n) => { setWeekOffset(n); if (n === 0) setSelectedDay(today); }} progress={progressOn} />}
    </section>
  );

  const listCard = (
    <section className="hx-list-card" aria-label="Список привычек">
      {visibleCount > 0 && (
        <div className="hx-filter" role="radiogroup" aria-label="Какие привычки показывать">
          <button type="button" role="radio" aria-checked={filter === "today"} className={filter === "today" ? "on" : ""} onClick={() => setFilter("today")}>{isToday ? "На сегодня" : "На этот день"}</button>
          <button type="button" role="radio" aria-checked={filter === "all"} className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Все</button>
        </div>
      )}
      {loading ? (
        <p className="hx-empty">Загружаем ваши привычки…</p>
      ) : visibleCount === 0 ? (
        <div className="hx-empty">
          <Illustration kind="habits" />
          <p>Добавьте первую привычку — например, пить воду или гулять вместе после ужина.</p>
          <button type="button" className="hx-add solid" onClick={() => setShowAdd(true)}><Plus size={16} aria-hidden />Добавить привычку</button>
        </div>
      ) : shownTotal === 0 ? (
        <p className="hx-empty">На этот день ничего не запланировано. <button type="button" className="hx-link" onClick={() => setFilter("all")}>Показать все привычки</button></p>
      ) : (
        groups.filter((g) => g.shown.length > 0).map((g) => {
          const doneIn = g.shown.filter(isDone).length;
          return (
            <div key={g.key} className="hx-group">
              <h3>{g.label}<span>{doneIn}/{g.shown.length}</span></h3>
              <ul>{g.shown.map(renderRow)}</ul>
            </div>
          );
        })
      )}
      {compact && visibleCount > 0 && <Link href="/habits" className="hx-more">Серии и статистика <ChevronRight size={15} aria-hidden /></Link>}
    </section>
  );

  return (
    <div className={compact ? "habits-embedded" : "hx-page"}>
      {!compact && <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft size={16} /> На главную</Link>}
      {!compact && (
        <header className="mb-5 sm:mb-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent-600"><Sparkles size={14} /> маленькие шаги каждый день</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-5xl">Наши привычки</h1>
        </header>
      )}

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className={compact ? "hx-compact" : "hx-stack"}>
        {!compact && <HabitStreakCard current={overall.current} best={overall.best} meName={profile.display_name} partner={partner && partnerOverall ? { name: partnerName, current: partnerOverall.current } : null} pair={pair} />}
        {!compact && (
          <div className="hx-seg hx-tabs" role="tablist" aria-label="Раздел привычек">
            <button role="tab" aria-selected={tab === "today"} className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>Привычки</button>
            <button role="tab" aria-selected={tab === "stats"} className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}>Статистика</button>
          </div>
        )}
        {(compact || tab === "today") ? (<>{dayCard}{listCard}</>) : (
          <HabitStatsPanel habits={habits} checkins={checkins} freezes={freezes} meId={profile.id} partner={partner ? { id: partner.id, name: partnerName } : null} today={today} />
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новая привычка">
        <form onSubmit={createHabit} className="space-y-5" noValidate>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={70} placeholder="Например, гулять вместе 20 минут" aria-label="Название привычки" className="hb-input" autoFocus />
          <div className="hb-segment" role="radiogroup" aria-label="Тип привычки">
            <button type="button" role="radio" aria-checked={draft.scope === "shared"} className={draft.scope === "shared" ? "active" : ""} onClick={() => setDraft({ ...draft, scope: "shared" })}>Общая</button>
            <button type="button" role="radio" aria-checked={draft.scope === "personal"} className={draft.scope === "personal" ? "active" : ""} onClick={() => setDraft({ ...draft, scope: "personal" })}>Личная</button>
          </div>
          <p className="hb-muted hb-caption">{draft.scope === "shared" ? "Общая привычка: отмечаете вы оба, прогресс виден обоим." : "Личная привычка: отмечаете только вы, партнёр видит ваш прогресс."}</p>
          <HabitStyleFields draft={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} disabled={saving} />
          <div className="flex justify-end gap-3">
            <button type="button" className="hx-cancel" onClick={() => setShowAdd(false)} disabled={saving}>Отмена</button>
            <button disabled={saving || !draft.title.trim()} className="hb-submit">{saving ? "Добавляем…" : "Добавить"}</button>
          </div>
        </form>
      </Modal>

      <HabitDetail
        habit={detail}
        checkins={checkins}
        freezes={freezes}
        me={{ id: profile.id, name: "Вы" }}
        partner={partner ? { id: partner.id, name: partnerName } : null}
        onClose={() => setDetail(null)}
        onToggleDay={toggleDayCheck}
        onOpenGlobalStats={() => { setDetail(null); setTab("stats"); }}
      />

      <HabitProgressModal
        habit={progressModal ? { ...progressModal.habit, target_value: Number(progressModal.habit.target_value) } : null}
        dayLabel={progressModal ? labelFor(progressModal.day) : ""}
        current={progressModal ? progressMap.get(`${progressModal.habit.id}:${profile.id}:${progressModal.day}`) ?? 0 : 0}
        onClose={() => setProgressModal(null)}
        onSave={(v) => (progressModal ? saveProgress(progressModal.habit, progressModal.day, v) : Promise.resolve())}
      />

      <HabitEditModal habit={editing} onClose={() => setEditing(null)} onSave={async (d) => { if (editing) await saveEdit(editing.id, d); }} />
      {celebrate && <ConfettiBurst key={celebrate.id} kind={celebrate.kind} onDone={() => setCelebrate(null)} />}
    </div>
  );
}
