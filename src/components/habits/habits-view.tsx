"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Flame, Plus, Sparkles, Trash2, Users, UserRound, Target, Pencil } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";

type Habit = { id: string; couple_id: string; owner_id: string | null; scope: "shared" | "personal"; title: string; created_at: string };
type Checkin = { habit_id: string; user_id: string; day: string };

function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function streakFor(rows: Checkin[], habitId: string, userId: string) {
  const days = new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === userId).map((r) => r.day));
  let cursor = new Date(`${localISO()}T12:00:00`);
  if (!days.has(localISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localISO(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

export function HabitsView({ compact = false }: { compact?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = localISO();
  const load = useCallback(async () => {
    if (!supabase || !couple || !profile) return;
    setLoading(true); setError("");
    const { data: habitRows, error: habitError } = await supabase.from("habits").select("*").eq("couple_id", couple.id).order("created_at", { ascending: false });
    if (habitError) { setError("Не удалось загрузить привычки. Проверьте, что применена миграция базы."); setLoading(false); return; }
    const list = (habitRows ?? []) as Habit[];
    setHabits(list);
    if (list.length) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 365);
      const { data: marks, error: marksError } = await supabase.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", list.map((h) => h.id)).gte("day", localISO(cutoff));
      if (marksError) setError("Привычки загружены, но отметки пока недоступны.");
      setCheckins((marks ?? []) as Checkin[]);
    } else setCheckins([]);
    setLoading(false);
  }, [couple, profile]);

  useEffect(() => { void load(); }, [load]);

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
    const key = `${habit.id}:${userId}`;
    const existing = todayDone.has(key);
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
    if (deleteError) setError("Не удалось удалить привычку.");
    else await load();
  };

  if (!couple || !profile) return null;
  const shared = habits.filter((h) => h.scope === "shared");
  const personal = habits.filter((h) => h.scope === "personal" && h.owner_id === profile.id);
  const doneCount = shared.filter((h) => todayDone.has(`${h.id}:${profile.id}`) && (!partner || todayDone.has(`${h.id}:${partner.id}`))).length
    + personal.filter((h) => todayDone.has(`${h.id}:${profile.id}`)).length;
  const total = shared.length + personal.length;

  return (
    <div className={compact ? "habits-embedded" : "mx-auto max-w-5xl"}>
      {!compact && <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft size={16}/> На главную</Link>}
      {!compact && <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent-600"><Sparkles size={14}/> маленькие шаги каждый день</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Наши привычки</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">Поддерживайте друг друга и отмечайте маленькие победы. Здесь важна регулярность, а не идеальность.</p>
        </div>
        <div className="min-w-40 rounded-2xl border border-sand-200 bg-paper px-5 py-4 shadow-soft">
          <p className="text-xs text-ink-soft">Выполнено сегодня</p><p className="mt-1 text-3xl font-semibold tabular-nums">{doneCount}<span className="text-lg text-ink-faint"> / {total}</span></p>
        </div>
      </header>}

      {compact && <div className="mb-4 rounded-2xl border border-sand-200 bg-paper px-5 py-4 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-ink-soft">Общий прогресс за сегодня</p><p className="mt-1 text-2xl font-semibold tabular-nums">{doneCount}<span className="text-base font-normal text-ink-faint"> / {total} привычек</span></p></div><span className="rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700">{total ? Math.round(doneCount / total * 100) : 0}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100"><div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${total ? doneCount / total * 100 : 0}%` }} /></div></div>}

      <form onSubmit={createHabit} className="mb-8 rounded-3xl border border-sand-200 bg-paper p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-accent-100 text-accent-700"><Plus size={20}/></span><div><h2 className="font-semibold">Добавить привычку</h2><p className="text-xs text-ink-soft">Начните с чего-то простого и приятного</p></div></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} placeholder="Например, гулять вместе 20 минут" className="h-12 min-w-0 flex-1 rounded-xl border border-sand-300 bg-milk px-4 text-sm outline-none transition focus:border-accent-600" required/>
          <select value={scope} onChange={(e) => setScope(e.target.value as "shared" | "personal")} className="h-12 rounded-xl border border-sand-300 bg-milk px-3 text-sm">
            <option value="shared">Общая для двоих</option><option value="personal">Моя личная</option>
          </select>
          <button disabled={saving || !title.trim()} className="h-12 rounded-xl bg-accent-600 px-5 text-sm font-semibold text-on-accent transition hover:bg-accent-700 disabled:opacity-50">{saving ? "Добавляем…" : "Добавить"}</button>
        </div>
      </form>

      {error && <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {loading ? <div className="rounded-3xl border border-sand-200 bg-paper p-10 text-center text-sm text-ink-soft">Загружаем ваши привычки…</div> : total === 0 ? (
        <div className="rounded-3xl border border-dashed border-sand-300 bg-paper px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-100 text-accent-700"><Target size={26}/></span>
          <h2 className="mt-4 font-serif text-2xl font-semibold">Всё начинается с малого</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">Добавьте первую привычку — например, пить воду, читать перед сном или гулять вместе после ужина.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {shared.length > 0 && <section><div className="mb-3 flex items-center gap-2"><Users size={17} className="text-accent-600"/><h2 className="font-semibold">Вместе</h2><span className="text-xs text-ink-faint">{shared.length}</span></div><div className="space-y-3">{shared.map((habit) => <article key={habit.id} className="rounded-2xl border border-sand-200 bg-paper p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{habit.title}</h3><p className="mt-1 flex items-center gap-1 text-xs text-ink-soft"><Flame size={13}/> {streakFor(checkins, habit.id, profile.id)} дн. ваша серия · {streakFor(checkins, habit.id, partner?.id ?? "")} дн. серия партнёра</p></div><div className="flex gap-1"><button onClick={() => void edit(habit)} aria-label={`Изменить ${habit.title}`} className="rounded-lg p-2 text-ink-faint hover:bg-accent-100 hover:text-accent-700"><Pencil size={15}/></button><button onClick={() => void remove(habit)} aria-label={`Удалить ${habit.title}`} className="rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger"><Trash2 size={16}/></button></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void toggle(habit, profile.id)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${todayDone.has(`${habit.id}:${profile.id}`) ? "bg-success-soft text-success" : "bg-milk text-ink hover:bg-accent-100"}`}><Check size={16}/>{todayDone.has(`${habit.id}:${profile.id}`) ? "Вы отметили" : "Отметить себя"}</button>{partner && <button onClick={() => void toggle(habit, partner.id)} disabled className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${todayDone.has(`${habit.id}:${partner.id}`) ? "bg-success-soft text-success" : "bg-milk text-ink-faint"}`}><Check size={16}/>{todayDone.has(`${habit.id}:${partner.id}`) ? "Партнёр отметил" : "Ждём партнёра"}</button>}</div>
          </article>)}</div></section>}
          {personal.length > 0 && <section><div className="mb-3 flex items-center gap-2"><UserRound size={17} className="text-accent-600"/><h2 className="font-semibold">Личное</h2><span className="text-xs text-ink-faint">{personal.length}</span></div><div className="space-y-3">{personal.map((habit) => <article key={habit.id} className="rounded-2xl border border-sand-200 bg-paper p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{habit.title}</h3><p className="mt-1 flex items-center gap-1 text-xs text-ink-soft"><Flame size={13}/> Серия: {streakFor(checkins, habit.id, profile.id)} дней</p></div><div className="flex gap-1"><button onClick={() => void edit(habit)} aria-label={`Изменить ${habit.title}`} className="rounded-lg p-2 text-ink-faint hover:bg-accent-100 hover:text-accent-700"><Pencil size={15}/></button><button onClick={() => void remove(habit)} aria-label={`Удалить ${habit.title}`} className="rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger"><Trash2 size={16}/></button></div></div><button onClick={() => void toggle(habit, profile.id)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${todayDone.has(`${habit.id}:${profile.id}`) ? "bg-success-soft text-success" : "bg-milk text-ink hover:bg-accent-100"}`}><Check size={16}/>{todayDone.has(`${habit.id}:${profile.id}`) ? "Сегодня выполнено" : "Отметить за сегодня"}</button></article>)}</div></section>}
        </div>
      )}
      <p className="mt-8 text-center text-xs leading-relaxed text-ink-faint">Отметки сохраняются в вашем общем пространстве. Серия считается по последовательным дням.</p>
    </div>
  );
}
