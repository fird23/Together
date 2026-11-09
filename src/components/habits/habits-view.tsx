"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Check, Flame, Pencil, Plus, Snowflake, Sparkles, Trash2, Trophy, Zap } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { RowMenu } from "@/components/ui/row-menu";
import { ConfettiBurst } from "@/components/ui/confetti";
import { HabitDetail } from "@/components/habits/habit-detail";
import { HabitEditModal, HabitStyleFields, emptyDraft, scheduleColumns, validateDraft, type HabitDraft } from "@/components/habits/habit-form";
import { colorHex } from "@/utils/calendar";
import { HabitIcon } from "@/utils/habit-icons";
import { computeStreak, dueToday, scheduleKind, scheduleLabel } from "@/utils/habit-stats";
import type { EventColor } from "@/types";
import { featureOn } from "@/utils/features";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { useRealtime } from "@/hooks/use-realtime";
import { Modal } from "@/components/ui/modal";

type Habit = {
  id: string; couple_id: string; owner_id: string | null; scope: "shared" | "personal"; title: string; created_at: string;
  color?: EventColor | null; icon?: string | null; week_days?: number[] | null; per_week?: number | null;
};
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

const initial = (name?: string) => (name?.trim()[0] ?? "?").toUpperCase();

export function HabitsView({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [freezes, setFreezes] = useState<Freeze[]>([]);
  const [freezeReady, setFreezeReady] = useState(false);
  const [celebrate, setCelebrate] = useState<{ kind: "first" | "all"; id: number } | null>(null);
  const celebrateSeq = useRef(0);
  const [draft, setDraft] = useState<HabitDraft>(emptyDraft);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [showGlobalStats, setShowGlobalStats] = useState(false);
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
      setFreezeReady(!freezeError);
      setFreezes(freezeError ? [] : ((frozen ?? []) as Freeze[]));
    } else { setCheckins([]); setFreezes([]); }
    setLoading(false);
  }, [couple, profile]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("habits", () => load(true), { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });
  useRealtime("habit_checkins", () => load(true), { enabled: Boolean(couple) });
  useRealtime("habit_freezes", () => load(true), { enabled: Boolean(couple) });

  const todayDone = useMemo(() => new Set(checkins.filter((c) => c.day === today).map((c) => `${c.habit_id}:${c.user_id}`)), [checkins, today]);

  const createHabit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !couple || !profile) return;
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("habits").insert({
      couple_id: couple.id, owner_id: draft.scope === "personal" ? profile.id : null,
      scope: draft.scope, title: draft.title.trim(), color: draft.color, icon: draft.icon, ...scheduleColumns(draft),
    });
    if (insertError) setError("Не удалось создать привычку.");
    else { setDraft(emptyDraft()); await load(); }
    setSaving(false);
  };

  const toggleDayCheck = async (habitId: string, userId: string, dayStr: string) => {
    if (!supabase) return;
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
        setCheckins((old) => [...old, { habit_id: habitId, user_id: userId, day: dayStr }]);
        if (userId === profile?.id && dayStr === today) {
          const mineIds = habits.filter((h) => (h.scope === "shared" || h.owner_id === userId) && dueToday(h, setOf(checkins, h.id, userId), today).due).map((h) => h.id);
          const before = mineIds.filter((id) => todayDone.has(`${id}:${userId}`)).length;
          if (mineIds.includes(habitId)) {
            celebrateSeq.current += 1;
            if (before + 1 === mineIds.length) setCelebrate({ kind: "all", id: celebrateSeq.current });
            else if (before === 0) setCelebrate({ kind: "first", id: celebrateSeq.current });
          }
        }
      }
    }
  };

  const toggleFreezeDay = async (habitId: string, userId: string, dayStr: string) => {
    if (!supabase) return;
    setError("");
    const isFrozen = freezes.some((f) => f.habit_id === habitId && f.user_id === userId && f.day === dayStr);
    if (isFrozen) {
      await supabase.from("habit_freezes").delete().eq("habit_id", habitId).eq("user_id", userId).eq("day", dayStr);
    } else {
      await supabase.from("habit_freezes").insert({ habit_id: habitId, user_id: userId, day: dayStr });
    }
    await load(true);
  };

  const toggle = async (habit: Habit, userId: string) => {
    await toggleDayCheck(habit.id, userId, today);
  };

  const yesterday = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 1); return localISO(d); })();
  const monthKey = today.slice(0, 7);
  const freezesLeft = (habitId: string) => 3 - freezes.filter((f) => f.habit_id === habitId && f.user_id === profile?.id && f.day.startsWith(monthKey)).length;

  const toggleFreeze = async (habit: Habit) => {
    if (!supabase || !profile) return;
    setError("");
    const mine = freezes.find((f) => f.habit_id === habit.id && f.user_id === profile.id && (f.day === today || f.day === yesterday));
    if (mine) {
      const { error: delError } = await supabase.from("habit_freezes").delete().eq("habit_id", habit.id).eq("user_id", profile.id).eq("day", mine.day);
      if (delError) setError("Не удалось снять заморозку."); else await load(true);
      return;
    }
    const missedYesterday = !checkins.some((c) => c.habit_id === habit.id && c.user_id === profile.id && c.day === yesterday);
    const day = missedYesterday ? yesterday : today;
    const { error: insError } = await supabase.from("habit_freezes").insert({ habit_id: habit.id, user_id: profile.id, day });
    if (insError) setError(insError.message);
    else await load(true);
  };

  const saveEdit = async (id: string, d: HabitDraft) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("habits").update({ title: d.title.trim(), color: d.color, icon: d.icon, ...scheduleColumns(d) }).eq("id", id);
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
  const dueList = [...shared, ...mine].filter((h) => dueToday(h, setOf(checkins, h.id, profile.id), today).due);
  const total = dueList.length;
  const doneCount = dueList.filter((h) => todayDone.has(`${h.id}:${profile.id}`) && (h.scope !== "shared" || !partner || todayDone.has(`${h.id}:${partner.id}`))).length;
  const visibleCount = shared.length + mine.length + theirs.length;

  const habitStreaks = habits.map((h) => {
    const d = setOf(checkins, h.id, profile.id);
    const f = setOf(freezes, h.id, profile.id);
    const st = computeStreak(h, d, f, today);
    return { id: h.id, title: h.title, current: st.current, icon: h.icon };
  }).sort((a, b) => b.current - a.current);

  const bestStreak = habitStreaks.length > 0 ? Math.max(...habitStreaks.map(s => s.current)) : 0;
  const totalMarks = checkins.length;

  const renderRow = (habit: Habit) => {
    const isTheirs = habit.scope === "personal" && habit.owner_id !== profile.id;
    const owner = isTheirs ? partner : profile;
    const done = !!owner && todayDone.has(`${habit.id}:${owner.id}`);
    const partnerDone = !!partner && todayDone.has(`${habit.id}:${partner.id}`);
    const ownerSet = owner ? setOf(checkins, habit.id, owner.id) : new Set<string>();
    const due = dueToday(habit, ownerSet, today);
    const label = scheduleLabel(habit);
    const kind = scheduleKind(habit);
    const note = kind === "count" ? `${label} · на этой неделе ${due.weekDone}/${habit.per_week}` : label;
    const hue = habit.color ? colorHex(habit.color) : undefined;
    return (
      <li key={habit.id} className={`hb-row ${done ? "is-done" : ""} ${!due.due && !done ? "not-due" : ""}`} style={hue ? ({ "--hc": hue } as React.CSSProperties) : undefined}>
        {isTheirs ? (
          <span className={`hb-check is-static ${done ? "checked" : ""}`} title={done ? `${partnerName} выполнил(а) сегодня` : `${partnerName} ещё не отметил(а)`}>
            {done && <Check size={14} />}
          </span>
        ) : (
          <button type="button" onClick={() => void toggle(habit, profile.id)} aria-pressed={done}
            aria-label={done ? `Снять отметку: ${habit.title}` : `Отметить: ${habit.title}`} className={`hb-check ${done ? "checked" : ""}`}>
            {done && <Check size={14} />}
          </button>
        )}
        <span className="hb-icon" aria-hidden="true"><HabitIcon id={habit.icon} /></span>
        <button type="button" className="hb-title hb-title-btn" onClick={() => setDetail(habit)} aria-label={`Статистика: ${habit.title}`}>
          <span>{habit.title}</span>
          {(note || (!due.due && !done)) && <small>{!due.due && !done ? (kind === "count" ? "Норма недели выполнена" : "Сегодня не по расписанию") : note}</small>}
        </button>
        {habit.scope === "shared" && partner && (
          <span className="hb-who" aria-label="Кто выполнил сегодня">
            <i className={todayDone.has(`${habit.id}:${profile.id}`) ? "on" : ""} title={`Вы: ${todayDone.has(`${habit.id}:${profile.id}`) ? "выполнено" : "не выполнено"}`}>{initial(profile.display_name)}</i>
            <i className={todayDone.has(`${habit.id}:${partner.id}`) ? "on" : ""} title={`${partnerName}: ${partnerDone ? "выполнено" : "не выполнено"}`}>{initial(partnerName)}</i>
          </span>
        )}
        {!isTheirs && freezeReady && (() => {
          const active = freezes.some((f) => f.habit_id === habit.id && f.user_id === profile.id && (f.day === today || f.day === yesterday));
          const left = freezesLeft(habit.id);
          if (!active && done) return null;
          return (
            <button type="button" className={`hb-freeze ${active ? "is-active" : ""}`} disabled={!active && left <= 0} onClick={() => void toggleFreeze(habit)}
              title={active ? "Снять заморозку" : left > 0 ? `Заморозить день (осталось ${left} из 3)` : "Заморозки закончились"}
              aria-label="Заморозить день">
              <Snowflake size={14} />{!active && <small>{left}</small>}
            </button>
          );
        })()}
        {!isTheirs && (
          <span className="hb-actions">
            <button type="button" onClick={() => setDetail(habit)} aria-label={`Статистика ${habit.title}`}><BarChart3 size={14} /></button>
            <button type="button" onClick={() => setEditing(habit)} aria-label={`Изменить ${habit.title}`}><Pencil size={14} /></button>
            <button type="button" onClick={() => void remove(habit)} aria-label={`Удалить ${habit.title}`} className="danger"><Trash2 size={14} /></button>
          </span>
        )}
        {isTheirs && <RowMenu label={habit.title} items={[{ label: "Статистика", icon: BarChart3, onClick: () => setDetail(habit) }]} />}
        {!isTheirs && (
          <RowMenu label={habit.title} items={[
            { label: "Статистика", icon: BarChart3, onClick: () => setDetail(habit) },
            { label: "Изменить", icon: Pencil, onClick: () => setEditing(habit) },
            { label: "Удалить", icon: Trash2, danger: true, onClick: () => void remove(habit) },
          ]} />
        )}
      </li>
    );
  };

  const groups = [
    { key: "shared", label: "Вместе", list: shared },
    { key: "mine", label: "Мои", list: mine },
    { key: "theirs", label: `Личные · ${partnerName}`, list: theirs },
  ].filter((g) => g.list.length > 0);

  return (
    <div className={compact ? "habits-embedded" : "mx-auto max-w-5xl"}>
      {!compact && <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft size={16} /> На главную</Link>}
      {!compact && (
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent-600"><Sparkles size={14} /> маленькие шаги каждый день</p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Наши привычки</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">Поддерживайте друг друга и отмечайте маленькие победы.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowGlobalStats(true)}
            className="px-4 py-2.5 rounded-2xl bg-paper shadow-soft ring-1 ring-sand-200 hover:ring-accent-500 font-medium text-xs flex items-center gap-2 text-ink transition-all self-start sm:self-auto"
          >
            <Trophy size={15} className="text-accent-600" /> Общая статистика пары
          </button>
        </header>
      )}

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="hb-layout">
        <section className="dashboard-card hb-main" aria-label="Привычки">
          <div className="hb-progress">
            <ProgressRing done={doneCount} total={total} />
            <div>
              <span className="hb-progress-label">Сегодня</span>
              <strong>{total === 0 ? "Пока нечего отмечать" : doneCount === total ? "Всё сделано 🎉" : `Осталось: ${total - doneCount}`}</strong>
            </div>
          </div>

          {loading ? (
            <p className="hb-empty">Загружаем ваши привычки…</p>
          ) : visibleCount === 0 ? (
            <div className="hb-empty">
              <Illustration kind="habits" />
              <p>Добавьте первую привычку — например, пить воду или гулять вместе после ужина.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="hb-group">
                <h3 className="hb-group-title">{g.label}<span>{g.list.length}</span></h3>
                <ul>{g.list.map(renderRow)}</ul>
              </div>
            ))
          )}
        </section>

        {/* Блок серий */}
        <aside className="hb-side space-y-4">
          <section className="dashboard-card p-5 rounded-2xl bg-gradient-to-br from-paper to-sand-50/50 shadow-soft ring-1 ring-sand-200 relative overflow-hidden" aria-label="Серии">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Zap size={15} className="text-accent-600 fill-accent-600" /> Успехи и серии
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-accent-100 text-accent-700 flex items-center gap-1">
                <Flame size={13} className="fill-accent-500" /> {bestStreak} дн. рекорд
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-xl bg-paper border border-sand-200 text-center">
                <span className="text-[10px] text-ink-faint block">Всего побед</span>
                <strong className="text-lg font-bold text-ink">{totalMarks}</strong>
              </div>
              <div className="p-3 rounded-xl bg-paper border border-sand-200 text-center">
                <span className="text-[10px] text-ink-faint block">Привычек</span>
                <strong className="text-lg font-bold text-ink">{habits.length}</strong>
              </div>
            </div>
            
            {habitStreaks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {habitStreaks.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-paper/80 border border-sand-200/60">
                    <span className="font-medium truncate max-w-[130px]">{s.title}</span>
                    <span className="flex items-center gap-1 font-bold text-accent-700">
                      <Flame size={12} className="text-accent-500 fill-accent-500" /> {s.current}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGlobalStats(true)}
              className="w-full py-2 px-3 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Trophy size={14} /> Подробная статистика пары
            </button>
          </section>

          {/* Форма создания привычки */}
          <form onSubmit={createHabit} className="dashboard-card p-4 rounded-2xl bg-paper shadow-soft ring-1 ring-sand-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3 flex items-center gap-1.5">
              <Plus size={14} /> Новая привычка
            </h3>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={70} placeholder="Например, гулять вместе 20 минут" aria-label="Название привычки" className="hb-input text-xs mb-3" />
            <div className="hb-segment mb-3" role="radiogroup" aria-label="Тип привычки">
              <button type="button" role="radio" aria-checked={draft.scope === "shared"} className={draft.scope === "shared" ? "active" : ""} onClick={() => setDraft({ ...draft, scope: "shared" })}>Общая</button>
              <button type="button" role="radio" aria-checked={draft.scope === "personal"} className={draft.scope === "personal" ? "active" : ""} onClick={() => setDraft({ ...draft, scope: "personal" })}>Личная</button>
            </div>
            <details className="hf-details">
              <summary className="text-xs font-medium cursor-pointer text-accent-700">Цвет, иконка и расписание</summary>
              <div className="mt-3">
                <HabitStyleFields draft={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} disabled={saving} />
              </div>
            </details>
            <button disabled={saving || !draft.title.trim()} className="hb-submit mt-3 text-xs py-2">{saving ? "Добавляем…" : "Добавить"}</button>
          </form>
        </aside>
      </div>

      <HabitDetail 
        habit={detail} 
        checkins={checkins} 
        freezes={freezes} 
        me={{ id: profile.id, name: "Вы" }} 
        partner={partner ? { id: partner.id, name: partnerName } : null} 
        onClose={() => setDetail(null)}
        onToggleDay={toggleDayCheck}
        onToggleFreeze={toggleFreezeDay}
        onOpenGlobalStats={() => setShowGlobalStats(true)}
      />

      {/* Модальное окно общей статистики пары */}
      <Modal open={showGlobalStats} onClose={() => setShowGlobalStats(false)} title="Общая статистика пары" size="lg">
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 text-center">
              <span className="text-xs text-ink-faint block mb-1">Всего побед пары</span>
              <strong className="text-3xl font-serif font-bold text-accent-700">{totalMarks}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 text-center">
              <span className="text-xs text-ink-faint block mb-1">Активных привычек</span>
              <strong className="text-3xl font-serif font-bold text-ink">{habits.length}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 text-center">
              <span className="text-xs text-ink-faint block mb-1">Лучшая серия</span>
              <strong className="text-3xl font-serif font-bold text-accent-600">🔥 {bestStreak} дн.</strong>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">Прогресс по привычкам</h4>
            <div className="space-y-2.5">
              {habits.map((h) => {
                const count = checkins.filter((c) => c.habit_id === h.id).length;
                return (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-paper border border-sand-200">
                    <span className="font-medium text-sm flex items-center gap-2">
                      <HabitIcon id={h.icon} size={16} /> {h.title}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-50 text-accent-700">
                      {count} отметок всего
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <HabitEditModal habit={editing} onClose={() => setEditing(null)} onSave={async (d) => { if (editing) await saveEdit(editing.id, d); }} />
      {celebrate && <ConfettiBurst key={celebrate.id} kind={celebrate.kind} onDone={() => setCelebrate(null)} />}
    </div>
  );
}