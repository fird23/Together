"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Flame, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
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
  if (!userId) return 0;
  const days = new Set(rows.filter((r) => r.habit_id === habitId && r.user_id === userId).map((r) => r.day));
  const cursor = new Date(`${localISO()}T12:00:00`);
  if (!days.has(localISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localISO(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
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
  const streaks = [
    ...shared.map((h) => ({ id: h.id, title: h.title, items: [
      { who: "Вы", n: streakFor(checkins, h.id, profile.id) },
      ...(partner ? [{ who: partnerName, n: streakFor(checkins, h.id, partner.id) }] : []),
    ] })),
    ...mine.map((h) => ({ id: h.id, title: h.title, items: [{ who: "Вы", n: streakFor(checkins, h.id, profile.id) }] })),
    ...theirs.map((h) => ({ id: h.id, title: h.title, items: [{ who: partnerName, n: streakFor(checkins, h.id, partner!.id) }] })),
  ].sort((a, b) => Math.max(...b.items.map((i) => i.n)) - Math.max(...a.items.map((i) => i.n)));

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
            <div><span className="hb-progress-label">Сегодня</span><strong>{doneCount}<small> / {total}</small></strong></div>
            <div className="hb-bar" aria-hidden="true"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
          </div>

          {loading ? (
            <p className="hb-empty">Загружаем ваши привычки…</p>
          ) : visibleCount === 0 ? (
            <div className="hb-empty">
              <Target size={22} />
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
                {streaks.map((s) => (
                  <li key={s.id}>
                    <span className="hb-streak-title">{s.title}</span>
                    <span className="hb-streak-values">
                      {s.items.map((i) => (
                        <span key={i.who} className={i.n > 0 ? "active" : ""} title={`${i.who}: ${i.n} ${pluralDays(i.n)} подряд`}>
                          {s.items.length > 1 && <b>{initial(i.who)}</b>}{i.n}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hb-muted hb-caption">Серия — дни подряд без пропусков.</p>
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
