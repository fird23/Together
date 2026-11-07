"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Heart, ListChecks, Target } from "lucide-react";
import { MoodIcon } from "@/components/mood/mood-icons";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { db } from "@/lib/supabase";
import { addDays, todayISO } from "@/utils/days";
import { featureOn } from "@/utils/features";

type Stats = {
  habitPct: { me: number; partner: number } | null;
  todos: { me: number; partner: number };
  gratitude: { me: number; partner: number };
  moods: { me: Record<string, string>; partner: Record<string, string> };
};

function Bar({ label, value }: { label: string; value: number }) {
  return <div className="ws-bar"><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>;
}
function Pair({ me, partnerValue, partnerName }: { me: number; partnerValue: number; partnerName: string }) {
  return <p className="ws-pair"><span><b>{me}</b> вы</span><span><b>{partnerValue}</b> {partnerName}</span></p>;
}

const weekday = (iso: string) => new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Итоги последних 7 дней: привычки, дела, настроение и благодарности у вас обоих. */
export function WeeklySummary() {
  const { couple, profile, partner } = useWorkspace();
  const [stats, setStats] = useState<Stats | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));

  const load = useCallback(async () => {
    if (!couple || !profile) return;
    const from = addDays(todayISO(), -6);
    const sb = db();
    const meId = profile.id, pId = partner?.id ?? "";
    const [habitsRes, moodRes, todoRes, gratRes] = await Promise.all([
      sb.from("habits").select("id,scope,owner_id").eq("couple_id", couple.id),
      sb.from("mood_entries").select("user_id,mood,day").eq("couple_id", couple.id).gte("day", from),
      sb.from("todos").select("done_by").eq("couple_id", couple.id).not("done_at", "is", null).gte("done_at", `${from}T00:00:00`),
      sb.from("gratitude_notes").select("user_id").eq("couple_id", couple.id).gte("day", from),
    ]);
    const habits = habitsRes.data ?? [];
    let habitPct: Stats["habitPct"] = null;
    if (habits.length) {
      const { data: marks } = await sb.from("habit_checkins").select("habit_id,user_id,day").in("habit_id", habits.map((h) => h.id)).gte("day", from);
      const pct = (uid: string) => {
        const mine = habits.filter((h) => h.scope === "shared" || h.owner_id === uid);
        if (!uid || !mine.length) return 0;
        const ids = new Set(mine.map((h) => h.id));
        const done = new Set((marks ?? []).filter((m) => m.user_id === uid && ids.has(m.habit_id)).map((m) => `${m.habit_id}:${m.day}`)).size;
        return Math.round((done / (mine.length * 7)) * 100);
      };
      habitPct = { me: pct(meId), partner: pct(pId) };
    }
    const count = (rows: { [k: string]: unknown }[] | null, key: string, uid: string) => (rows ?? []).filter((r) => r[key] === uid).length;
    const moodMap = (uid: string) => Object.fromEntries((moodRes.data ?? []).filter((m) => m.user_id === uid).map((m) => [m.day as string, m.mood as string]));
    setStats({
      habitPct,
      todos: { me: count(todoRes.data, "done_by", meId), partner: count(todoRes.data, "done_by", pId) },
      gratitude: { me: count(gratRes.data, "user_id", meId), partner: count(gratRes.data, "user_id", pId) },
      moods: { me: moodMap(meId), partner: moodMap(pId) },
    });
  }, [couple, profile, partner]);
  useEffect(() => { void load(); }, [load]);

  if (!couple || !profile) return null;
  if (!stats) return <p className="text-sm text-ink-soft">Считаем итоги…</p>;
  const partnerName = partner?.display_name ?? "Партнёр";

  return (
    <div className="weekly-summary dashboard-card">
      <p className="ws-range">Последние 7 дней · {days[0].slice(8)}.{days[0].slice(5, 7)} — {days[6].slice(8)}.{days[6].slice(5, 7)}</p>
      <div className="ws-grid">
        {featureOn(couple, "habits") && stats.habitPct && (
          <div className="ws-tile"><h3><Target size={15} /> Привычки</h3><Bar label="Вы" value={stats.habitPct.me} /><Bar label={partnerName} value={stats.habitPct.partner} /></div>
        )}
        {featureOn(couple, "todos") && (
          <div className="ws-tile"><h3><ListChecks size={15} /> Сделано дел</h3><p className="ws-big">{stats.todos.me + stats.todos.partner}</p><Pair me={stats.todos.me} partnerValue={stats.todos.partner} partnerName={partnerName} /></div>
        )}
        {featureOn(couple, "gratitude") && (
          <div className="ws-tile"><h3><Heart size={15} /> Благодарности</h3><p className="ws-big">{stats.gratitude.me + stats.gratitude.partner}</p><Pair me={stats.gratitude.me} partnerValue={stats.gratitude.partner} partnerName={partnerName} /></div>
        )}
        <div className="ws-tile ws-moods">
          <h3><CheckCheck size={15} /> Настроение</h3>
          {([["Вы", stats.moods.me], [partnerName, stats.moods.partner]] as const).map(([name, map]) => (
            <div className="ws-mood-row" key={name}>
              <span className="ws-mood-name">{name}</span>
              <span className="ws-mood-days">
                {days.map((d) => <span key={d} title={`${weekday(d)}: ${map[d] ? "" : "нет отметки"}`}>{map[d] ? <MoodIcon mood={map[d]} size={22} /> : <i />}</span>)}
              </span>
            </div>
          ))}
          <div className="ws-mood-row"><span className="ws-mood-name" /><span className="ws-mood-days ws-days-label">{days.map((d) => <span key={d}>{weekday(d)}</span>)}</span></div>
        </div>
      </div>
    </div>
  );
}
