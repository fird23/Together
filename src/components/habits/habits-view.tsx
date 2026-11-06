"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Flame, Heart, Pencil, Plus, Snowflake, Sparkles, Trash2 } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { featureOn } from "@/utils/features";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { useRealtime } from "@/hooks/use-realtime";

type Habit = { id: string; couple_id: string; owner_id: string | null; scope: "shared" | "personal"; title: string; created_at: string };
type Checkin = { habit_id: string; user_id: string; day: string };
type Freeze = { habit_id: string; user_id: string; day: string };

function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Серия: дни подряд с отметкой. Замороженный день серию не рвёт, но и не растит. */
function streakFor(rows: Checkin[], freezes: Freeze[], habitId: string, userId: string) {
  if (!userId) return 0;
  const done = new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === userId).map((r) => r.day));
  const frozen = new Set(freezes.filter((r) => r.habit_id === habitId && r.user_id === userId).map((r) => r.day));
  const cursor = new Date(`${localISO()}T12:00:00`);
  const today = localISO(cursor);
  if (!done.has(today) && !frozen.has(today)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  for (;;) {
    const iso = localISO(cursor);
    if (done.has(iso)) count++;
    else if (!frozen.has(iso)) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Общая серия пары: дни, когда оба сделали привычку (заморозка одного не рвёт серию). */
function pairStreakFor(rows: Checkin[], freezes: Freeze[], habitId: string, a: string, b: string) {
  const mark = (uid: string, list: { habit_id: string; user_id: string; day: string }[]) => new Set(list.filter((r) => r.habit_id === habitId && r.user_id === uid).map((r) => r.day));
  const doneA = mark(a, rows), doneB = mark(b, rows), frA = mark(a, freezes), frB = mark(b, freezes);
  const covered = (d: string) => (doneA.has(d) || frA.has(d)) && (doneB.has(d) || frB.has(d));
  const cursor = new Date(`${localISO()}T12:00:00`);
  if (!covered(localISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  for (;;) {
    const iso = localISO(cursor);
    if (!covered(iso)) break;
    if (doneA.has(iso) && doneB.has(iso)) count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function lastDays(rows: Checkin[], freezes: Freeze[], habitId: string, userIds: string[], n = 14) {
  const doneBy = (uid: string) => new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === uid).map((r) => r.day));
  const frozenBy = (uid: string) => new Set(freezes.filter((r) => r.habit_id === habitId && r.user_id === uid).map((r) => r.day));
  const dones = userIds.map(doneBy), frozens = userIds.map(frozenBy);
  const cursor = new Date(`${localISO()}T12:00:00`);
  cursor.setDate(cursor.getDate() - (n - 1));
  return Array.from({ length: n }, () => {
    const iso = localISO(cursor);
    cursor.setDate(cursor.getDate() + 1);
    const done = dones.every((d) => d.has(iso));
    const frozen = !done && dones.every((d, i) => d.has(iso) || frozens[i].has(iso));
    return { iso, done, frozen };
  });
}
const tierOf = (n: number) => (n >= 30 ? 3 : n >= 7 ? 2 : n > 0 ? 1 : 0);
const milestoneOf = (n: number) => (n >= 100 ? "Сотня!" : n >= 30 ? "Месяц!" : n >= 7 ? "Неделя!" : "");

/** Кольцо прогресса за день. */
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
const pluralDays = (n: number) => {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
};

export function HabitsView({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [freezes, setFreezes] = useState<Freeze[]>([]);
  const [freezeReady, setFreezeReady] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = localISO();

  const load = useCallback(async (silent = false) => {
    if (!supabase || !couple || !profile) return;
    if (!silent) setLoading(true);
    setError("");
    const { data: habitRows, error: habitError } = await supabase.from("habits").select("*").eq("couple_id", couple.id).order("created_at", { ascending: false });
    if (habitError) { setError("Не удалось загрузить привычки. Проверьте, что применена миграция базы."); setLoading(false); return; }
    const list = (habitRows ?? []) as Habit[];
    setHabits(list);
    if (list.length) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 365);
      const { data: marks, error: marksError } = await supabase.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", list.map((h) => h.id)).gte("day", localISO(cutoff));
      if (marksError) setError("Привычки загружены, но отметки пока недоступны.");
      setCheckins((marks ?? []) as Checkin[]);
      const { data: frozen, error: freezeError } = await supabase.from("habit_freezes").select("habit_id,user_id,day").in("habit_id", list.map((h) => h.id)).gte("day", localISO(cutoff));
      setFreezeReady(!freezeError); // без миграции 015 просто не показываем заморозку
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
    if (!supabase || !couple || !profile || !title.trim()) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("habits").insert({
      couple_id: couple.id, owner_id: scope === "personal" ? profile.id : null,
      scope, title: title.trim(),
    });
    if (insertError) setError(insertError.message.includes("habits") ? "Не удалось создать привычку. Примените SQL-миграцию из папки supabase/migrations." : "Не удалось создать привычку.");
    else { setTitle(""); await load(); }
    setSaving(false);
  };

  const toggle = async (habit: Habit, userId: string) => {
    if (!supabase) return;
    const existing = todayDone.has(`${habit.id}:${userId}`);
    setError("");
    if (existing) {
      const { error: deleteError } = await supabase.from("habit_checkins").delete().eq("habit_id", habit.id).eq("user_id", userId).eq("day", today);
      if (deleteError) setError("Не удалось снять отметку.");
      else setCheckins((old) => old.filter((c) => !(c.habit_id === habit.id && c.user_id === userId && c.day === today)));
    } else {
      const { error: insertError } = await supabase.from("habit_checkins").insert({ habit_id: habit.id, user_id: userId, day: today });
      if (insertError) setError("Не удалось сохранить отметку.");
      else setCheckins((old) => [...old, { habit_id: habit.id, user_id: userId, day: today }]);
    }
  };

  const yesterday = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 1); return localISO(d); })();
  const monthKey = today.slice(0, 7);
  const freezesLeft = (habitId: string) => 3 - freezes.filter((f) => f.habit_id === habitId && f.user_id === profile?.id && f.day.startsWith(monthKey)).length;

  /** Заморозка: вчерашний пропуск или, если вчера всё в порядке, сегодняшний день. */
  const toggleFreeze = async (habit: Habit) => {
    if (!supabase || !profile) return;
    setError("");
    const mine = freezes.find((f) => f.habit_id === habit.id && f.user_id === profile.id && (f.day === today || f.day === yesterday));
    if (mine) {
      const { error: delError } = await supabase.from("habit_freezes").delete().eq("habit_id", habit.id).eq("user_id", profile.id).eq("day", mine.day);
      if (delError) setError("Не удалось снять заморозку."); else await load(true);
      return;
    }
    const missedYesterday = !todayDoneOn(habit.id, yesterday);
    const day = missedYesterday ? yesterday : today;
    const { error: insError } = await supabase.from("habit_freezes").insert({ habit_id: habit.id, user_id: profile.id, day });
    if (insError) setError(insError.message.includes("заморозк") || insError.message.includes("Заморозить") ? insError.message : "Не удалось заморозить день.");
    else await load(true);
  };
  const todayDoneOn = (habitId: string, day: string) => checkins.some((c) => c.habit_id === habitId && c.user_id === profile?.id && c.day === day);

  const edit = async (habit: Habit) => {
    if (!supabase) return;
    const next = window.prompt("Изменить название привычки", habit.title);
    if (next === null || !next.trim() || next.trim() === habit.title) return;
    const { error: updateError } = await supabase.from("habits").update({ title: next.trim() }).eq("id", habit.id);
    if (updateError) setError("Не удалось изменить привычку."); else await load();
  };

  const remove = async (habit: Habit) => {
    if (!supabase || !window.confirm(`Удалить привычку «${habit.title}» и её историю?`)) return;
    const { error: deleteError } = await supabase.from("habits").delete().eq("id", habit.id);
    if (deleteError) setError("Не удалось удалить привычку."); else await load();
  };

  if (!couple || !profile) return null;
  if (!featureOn(couple, "habits")) {
    return (
      <div className="dashboard-card hb-off">
        <Illustration kind="habits" className="mx-auto" />
        <p className="mt-3 font-semibold">Привычки отключены</p>
        <p className="mt-1 text-sm text-ink-soft">Блок выключен в настройках пары. Данные сохранены: включите его обратно, когда захотите.</p>
        <Link href="/settings#features" className="mt-4 inline-block text-sm font-semibold text-accent-700 underline underline-offset-4">Открыть настройки</Link>
      </div>
    );
  }

  const partnerName = partner?.display_name ?? "Партнёр";
  const shared = habits.filter((h) => h.scope === "shared");
  const mine = habits.filter((h) => h.scope === "personal" && h.owner_id === profile.id);
  const theirs = partner ? habits.filter((h) => h.scope === "personal" && h.owner_id === partner.id) : [];
  const total = shared.length + mine.length;
  const doneCount =
    shared.filter((h) => todayDone.has(`${h.id}:${profile.id}`) && (!partner || todayDone.has(`${h.id}:${partner.id}`))).length +
    mine.filter((h) => todayDone.has(`${h.id}:${profile.id}`)).length;
  const visibleCount = shared.length + mine.length + theirs.length;

  // Серии: у общих привычек — обе, у личных — только их владельца.
  const person = (who: string, habitId: string, userId: string) => ({ who, n: streakFor(checkins, freezes, habitId, userId), days: lastDays(checkins, freezes, habitId, [userId]) });
  const pair = (habitId: string) => ({ who: "Пара", n: pairStreakFor(checkins, freezes, habitId, profile.id, partner!.id), days: lastDays(checkins, freezes, habitId, [profile.id, partner!.id]) });
  const streaks = [
    ...shared.map((h) => ({ id: h.id, title: h.title, items: [person("Вы", h.id, profile.id), ...(partner ? [person(partnerName, h.id, partner.id), pair(h.id)] : [])] })),
    ...mine.map((h) => ({ id: h.id, title: h.title, items: [person("Вы", h.id, profile.id)] })),
    ...theirs.map((h) => ({ id: h.id, title: h.title, items: [person(partnerName, h.id, partner!.id)] })),
  ].sort((x, y) => Math.max(...y.items.map((i) => i.n)) - Math.max(...x.items.map((i) => i.n)));

  const renderRow = (habit: Habit) => {
    const isTheirs = habit.scope === "personal" && habit.owner_id !== profile.id;
    const owner = isTheirs ? partner : profile;
    const done = !!owner && todayDone.has(`${habit.id}:${owner.id}`);
    const partnerDone = !!partner && todayDone.has(`${habit.id}:${partner.id}`);
    return (
      <li key={habit.id} className={`hb-row ${done ? "is-done" : ""}`}>
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
        <span className="hb-title">{habit.title}</span>
        {habit.scope === "shared" && partner && (
          <span className="hb-who" aria-label="Кто выполнил сегодня">
            <i className={todayDone.has(`${habit.id}:${profile.id}`) ? "on" : ""} title={`Вы: ${todayDone.has(`${habit.id}:${profile.id}`) ? "выполнено" : "не выполнено"}`}>{initial(profile.display_name)}</i>
            <i className={partnerDone ? "on" : ""} title={`${partnerName}: ${partnerDone ? "выполнено" : "не выполнено"}`}>{initial(partnerName)}</i>
          </span>
        )}
        {!isTheirs && freezeReady && (() => {
          const active = freezes.some((f) => f.habit_id === habit.id && f.user_id === profile.id && (f.day === today || f.day === yesterday));
          const left = freezesLeft(habit.id);
          if (!active && done && !(!todayDoneOn(habit.id, yesterday))) return null; // нечего замораживать
          return (
            <button type="button" className={`hb-freeze ${active ? "is-active" : ""}`} disabled={!active && left <= 0} onClick={() => void toggleFreeze(habit)}
              title={active ? "Снять заморозку" : left > 0 ? `Заморозить день, чтобы не потерять серию (осталось ${left} из 3 в этом месяце)` : "В этом месяце заморозки закончились"}
              aria-label={active ? "Снять заморозку" : "Заморозить день"}>
              <Snowflake size={14} />{!active && <small>{left}</small>}
            </button>
          );
        })()}
        {!isTheirs && (
          <span className="hb-actions">
            <button type="button" onClick={() => void edit(habit)} aria-label={`Изменить ${habit.title}`}><Pencil size={14} /></button>
            <button type="button" onClick={() => void remove(habit)} aria-label={`Удалить ${habit.title}`} className="danger"><Trash2 size={14} /></button>
          </span>
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
        <header className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent-600"><Sparkles size={14} /> маленькие шаги каждый день</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Наши привычки</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">Поддерживайте друг друга и отмечайте маленькие победы. Здесь важна регулярность, а не идеальность.</p>
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
              <p>Всё начинается с малого. Добавьте первую привычку — например, пить воду или гулять вместе после ужина.</p>
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

        <aside className="hb-side">
          <section className="dashboard-card hb-card" aria-label="Серии">
            <h3 className="hb-card-title"><Flame size={15} /> Серии</h3>
            {streaks.length === 0 ? (
              <p className="hb-muted">Серии появятся, когда вы начнёте отмечать привычки.</p>
            ) : (
              <ul className="hb-streaks">
                {streaks.map((st) => {
                  const best = Math.max(...st.items.map((i) => i.n));
                  const tier = tierOf(best);
                  return (
                    <li key={st.id}>
                      <div className="hb-streak-top">
                        <span className="hb-streak-title">{st.title}</span>
                        <span className={`hb-flame tier-${tier}`} title={`Лучшая серия: ${best} ${pluralDays(best)} подряд`}>
                          <Flame size={14} aria-hidden="true" />{best}
                          {milestoneOf(best) && <em>{milestoneOf(best)}</em>}
                        </span>
                      </div>
                      {st.items.map((i) => (
                        <div key={i.who} className="hb-strip-row" title={`${i.who}: ${i.n} ${pluralDays(i.n)} подряд`}>
                          <b className={i.who === "Пара" ? "pair" : ""}>{i.who === "Пара" ? <Heart size={10} fill="currentColor" /> : initial(i.who)}</b>
                          <span className="hb-strip" aria-hidden="true">{i.days.map((d) => <i key={d.iso} className={d.done ? "on" : d.frozen ? "frozen" : ""} />)}</span>
                          <em className={i.n > 0 ? "active" : ""}>{i.n}</em>
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="hb-muted hb-caption">Серия — дни подряд без пропусков. Строка с сердцем — общая серия пары: считаются дни, когда выполнили оба. ❄ Заморозка сохраняет серию, если день пропущен: до 3 раз в месяц на привычку.</p>
          </section>

          <form onSubmit={createHabit} className="dashboard-card hb-card">
            <h3 className="hb-card-title"><Plus size={15} /> Новая привычка</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} placeholder="Например, гулять вместе 20 минут" aria-label="Название привычки" className="hb-input" required />
            <div className="hb-segment" role="radiogroup" aria-label="Тип привычки">
              <button type="button" role="radio" aria-checked={scope === "shared"} className={scope === "shared" ? "active" : ""} onClick={() => setScope("shared")}>Общая</button>
              <button type="button" role="radio" aria-checked={scope === "personal"} className={scope === "personal" ? "active" : ""} onClick={() => setScope("personal")}>Личная</button>
            </div>
            <p className="hb-muted hb-caption">{scope === "personal" ? "Партнёр увидит вашу привычку и серию, но отмечать её можете только вы." : "Каждый отмечает свою часть, серии считаются отдельно."}</p>
            <button disabled={saving || !title.trim()} className="hb-submit">{saving ? "Добавляем…" : "Добавить"}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
