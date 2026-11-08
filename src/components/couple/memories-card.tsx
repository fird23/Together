"use client";

import { useCallback, useEffect, useState } from "react";
import { Illustration } from "@/components/ui/illustrations";
import { MoodIcon } from "@/components/mood/mood-icons";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { db } from "@/lib/supabase";
import { listEvents } from "@/services/calendar";
import { expandEvents, eventsOnDay } from "@/utils/calendar";
import { addMonths, todayISO } from "@/utils/days";
import type { CalendarEvent } from "@/types";

type Memory = {
  date: string;
  label: string;
  moods: { me?: string; partner?: string };
  gratitude: { who: string; text: string }[];
  events: CalendarEvent[];
};

const PERIODS: { months: number; label: string }[] = [
  { months: 1, label: "Месяц назад" }, { months: 3, label: "3 месяца назад" }, { months: 6, label: "Полгода назад" },
  { months: 12, label: "Год назад" }, { months: 24, label: "2 года назад" }, { months: 36, label: "3 года назад" },
];
const longDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** «В этот день»: что у вас было в этот же день месяц, полгода, год назад: настроение, благодарности и события. */
export function MemoriesCard() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Memory[] | null>(null);

  const load = useCallback(async () => {
    if (!couple || !profile) return;
    const today = todayISO();
    const dates = PERIODS.map((p) => ({ date: addMonths(today, -p.months), label: p.label }));
    const days = dates.map((d) => d.date);
    const sb = db();
    const [moodRes, gratRes, events] = await Promise.all([
      sb.from("mood_entries").select("user_id,mood,day").eq("couple_id", couple.id).in("day", days),
      sb.from("gratitude_notes").select("user_id,text,day").eq("couple_id", couple.id).in("day", days),
      listEvents(couple.id, days[days.length - 1], days[0]).then((raw) => expandEvents(raw, days[days.length - 1], days[0])).catch(() => [] as CalendarEvent[]),
    ]);
    const result: Memory[] = [];
    for (const { date, label } of dates) {
      const mood = (uid?: string) => (moodRes.data ?? []).find((m) => m.day === date && m.user_id === uid)?.mood as string | undefined;
      const gratitude = (gratRes.data ?? []).filter((g) => g.day === date).map((g) => ({ who: g.user_id === profile.id ? "Вы" : partner?.display_name ?? "Партнёр", text: g.text as string }));
      const dayEvents = eventsOnDay(events, date);
      const moods = { me: mood(profile.id), partner: mood(partner?.id) };
      if (moods.me || moods.partner || gratitude.length || dayEvents.length) result.push({ date, label, moods, gratitude, events: dayEvents });
    }
    setItems(result);
  }, [couple, profile, partner]);
  useEffect(() => { void load(); }, [load]);

  if (!couple || !profile) return null;
  const partnerName = partner?.display_name ?? "Партнёр";

  return (
    <section className="dashboard-card memories-card">
      {items === null ? (
        <p className="text-sm text-ink-soft">Вспоминаем…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center text-sm text-ink-faint">
          <Illustration kind="gratitude" />
          <p className="max-w-sm">Пока нечего вспоминать. Через месяц здесь появятся ваши записи за этот же день: настроение, благодарности и события.</p>
        </div>
      ) : (
        <ul className="memories-list">
          {items.map((m) => (
            <li key={m.date}>
              <p className="memories-when"><strong>{m.label}</strong><span>{longDate(m.date)}</span></p>
              {(m.moods.me || m.moods.partner) && (
                <div className="memories-moods">
                  {m.moods.me && <span><MoodIcon mood={m.moods.me} size={26} />Вы</span>}
                  {m.moods.partner && <span><MoodIcon mood={m.moods.partner} size={26} />{partnerName}</span>}
                </div>
              )}
              {m.gratitude.map((g, i) => <p key={i} className="memories-text"><b>{g.who}:</b> {g.text}</p>)}
              {m.events.map((e) => <p key={`${e.id}:${e.start_day}`} className="memories-event">📅 {e.title}</p>)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
