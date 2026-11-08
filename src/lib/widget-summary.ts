import { db } from "@/lib/supabase";
import { listEvents } from "@/services/calendar";
import { expandEvents } from "@/utils/calendar";
import { addDays, todayISO } from "@/utils/days";
import { dueToday, weekStart } from "@/utils/habit-stats";
import { featureOn } from "@/utils/features";
import type { Couple, Profile } from "@/types";

export type WidgetSummary = {
  names: string;
  start: string;
  habits: { date: string; left: number; total: number } | null;
  event: { date: string; title: string } | null;
};

/** Сводка для виджета на главном экране: дни вместе, привычки на сегодня и ближайшее событие. */
export async function buildWidgetSummary(couple: Couple, me: Profile, partner: Profile | null): Promise<WidgetSummary> {
  const today = todayISO();
  const summary: WidgetSummary = {
    names: partner ? `${me.display_name} ♥ ${partner.display_name}` : me.display_name,
    start: couple.start_date,
    habits: null,
    event: null,
  };

  if (featureOn(couple, "habits")) {
    const { data: habits } = await db().from("habits").select("id,scope,owner_id,week_days,per_week").eq("couple_id", couple.id).or(`scope.eq.shared,owner_id.eq.${me.id}`);
    if (habits) {
      const { data: marks } = habits.length
        ? await db().from("habit_checkins").select("habit_id,day").in("habit_id", habits.map((h) => h.id)).eq("user_id", me.id).gte("day", weekStart(today))
        : { data: [] };
      let total = 0, left = 0;
      for (const h of habits) {
        const days = new Set((marks ?? []).filter((m) => m.habit_id === h.id).map((m) => m.day as string));
        if (!dueToday(h, days, today).due) continue;
        total++;
        if (!days.has(today)) left++;
      }
      summary.habits = { date: today, left, total };
    }
  }

  try {
    const events = expandEvents(await listEvents(couple.id, today, addDays(today, 7)), today, addDays(today, 7));
    const next = events.filter((e) => e.end_day >= today).sort((a, b) => a.start_day.localeCompare(b.start_day))[0];
    if (next) summary.event = { date: next.start_day < today ? today : next.start_day, title: next.title };
  } catch { /* календарь недоступен: виджет покажет остальное */ }

  return summary;
}
