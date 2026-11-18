"use client";

import { useCallback, useState } from "react";
import { CheckCheck, ChevronLeft, ChevronRight, Heart, ListChecks, RotateCcw, Target } from "lucide-react";
import { MoodIcon } from "@/components/mood/mood-icons";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useWeeklyLayout } from "@/hooks/use-weekly-layout";
import { SIZES, isWeeklyDefault, moveTile, resetWeeklyLayout, setTileSize, type TileId, type TileSize } from "@/lib/weekly-layout-store";
import { loadWeekData } from "@/services/insights";
import { loadMoodsSince } from "@/services/moods";
import { addDays, todayISO } from "@/utils/days";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";
import { useLoad } from "@/hooks/use-load";

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

const SIZE_LABEL: Record<TileSize, string> = { compact: "Компактный", normal: "Обычный", wide: "Широкий" };

const weekday = (iso: string) => new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Итоги последних 7 дней: привычки, дела, настроение и благодарности у вас обоих. */
export function WeeklySummary({ editing = false }: { editing?: boolean }) {
  const { couple, profile, partner } = useWorkspace();
  const layout = useWeeklyLayout();
  const [stats, setStats] = useState<Stats | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));

  const load = useCallback(async () => {
    if (!couple || !profile) return;
    const from = addDays(todayISO(), -6);
    const meId = profile.id, pId = partner?.id ?? "";
    const [week, moodRows] = await Promise.all([loadWeekData(couple.id, from), loadMoodsSince(couple.id, from)]);
    const { habits, marks } = week;
    let habitPct: Stats["habitPct"] = null;
    if (habits.length) {
      // План недели у каждой привычки: каждый день = 7, выбранные дни = их число, «N в неделю» = N.
      const planOf = (h: { week_days?: number[] | null; per_week?: number | null }) => (h.per_week ? h.per_week : h.week_days?.length ? h.week_days.length : 7);
      const pct = (uid: string) => {
        const mine = habits.filter((h) => h.scope === "shared" || h.owner_id === uid);
        if (!uid || !mine.length) return 0;
        let planned = 0, made = 0;
        for (const h of mine) {
          const plan = planOf(h);
          const doneDays = new Set(marks.filter((m) => m.user_id === uid && m.habit_id === h.id).map((m) => m.day)).size;
          planned += plan; made += Math.min(plan, doneDays);
        }
        return Math.round((made / planned) * 100);
      };
      habitPct = { me: pct(meId), partner: pct(pId) };
    }
    const count = (rows: { [k: string]: unknown }[] | null, key: string, uid: string) => (rows ?? []).filter((r) => r[key] === uid).length;
    const moodMap = (uid: string) => Object.fromEntries(moodRows.filter((m) => m.user_id === uid).map((m) => [m.day as string, m.mood as string]));
    setStats({
      habitPct,
      todos: { me: count(week.todos, "done_by", meId), partner: count(week.todos, "done_by", pId) },
      gratitude: { me: count(week.gratitude, "user_id", meId), partner: count(week.gratitude, "user_id", pId) },
      moods: { me: moodMap(meId), partner: moodMap(pId) },
    });
  }, [couple, profile, partner]);
  useLoad(load);

  if (!couple || !profile) return null;
  if (!stats) return <p className="text-sm text-ink-soft">Считаем итоги…</p>;
  const partnerName = partner?.display_name ?? "Партнёр";

  const tiles: Partial<Record<TileId, { label: string; body: React.ReactNode }>> = {};
  if (featureOn(couple, "habits") && stats.habitPct) {
    tiles.habits = { label: "Привычки", body: <><h3><Target size={15} /> Привычки</h3><Bar label="Вы" value={stats.habitPct.me} /><Bar label={partnerName} value={stats.habitPct.partner} /></> };
  }
  if (featureOn(couple, "todos")) {
    tiles.todos = { label: "Сделано дел", body: <><h3><ListChecks size={15} /> Сделано дел</h3><p className="ws-big">{stats.todos.me + stats.todos.partner}</p><Pair me={stats.todos.me} partnerValue={stats.todos.partner} partnerName={partnerName} /></> };
  }
  if (featureOn(couple, "gratitude")) {
    tiles.gratitude = { label: "Благодарности", body: <><h3><Heart size={15} /> Благодарности</h3><p className="ws-big">{stats.gratitude.me + stats.gratitude.partner}</p><Pair me={stats.gratitude.me} partnerValue={stats.gratitude.partner} partnerName={partnerName} /></> };
  }
  tiles.moods = {
    label: "Настроение",
    body: (
      <>
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
      </>
    ),
  };
  const visible = layout.order.filter((id) => tiles[id]);

  return (
    <div className="weekly-summary dashboard-card">
      <p className="ws-range">Последние 7 дней · {days[0].slice(8)}.{days[0].slice(5, 7)} — {days[6].slice(8)}.{days[6].slice(5, 7)}</p>
      {editing && (
        <div className="ws-edit-bar">
          <p>Двигайте плитки стрелками и выбирайте размер. Настройка хранится на этом устройстве.</p>
          <button type="button" onClick={resetWeeklyLayout} disabled={isWeeklyDefault(layout)}><RotateCcw size={14} /> Вернуть как было</button>
        </div>
      )}
      <div className="ws-grid">
        {visible.map((id, index) => {
          const size = layout.sizes[id];
          const tile = tiles[id]!;
          return (
            <div key={id} className={cn("ws-tile", `ws-${size}`, id === "moods" && "ws-moods", editing && "is-editing")}>
              {tile.body}
              {editing && (
                <div className="ws-tools" role="group" aria-label={`Плитка «${tile.label}»`}>
                  <span className="ws-move">
                    <button type="button" onClick={() => moveTile(id, -1, visible)} disabled={index === 0} aria-label={`Сдвинуть «${tile.label}» раньше`}><ChevronLeft size={16} /></button>
                    <button type="button" onClick={() => moveTile(id, 1, visible)} disabled={index === visible.length - 1} aria-label={`Сдвинуть «${tile.label}» позже`}><ChevronRight size={16} /></button>
                  </span>
                  <span className="ws-sizes" role="radiogroup" aria-label="Размер плитки">
                    {SIZES.map((sz) => (
                      <button key={sz} type="button" role="radio" aria-checked={size === sz} className={size === sz ? "on" : ""} onClick={() => setTileSize(id, sz)}>{SIZE_LABEL[sz]}</button>
                    ))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
