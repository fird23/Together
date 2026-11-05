"use client";

import React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { colorHex, eventsOnDay } from "@/utils/calendar";
import { todayISO } from "@/utils/days";

export function CalendarPreview() {
  const [offset, setOffset] = React.useState(0);
  const base = new Date();
  const shown = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = shown.getFullYear(); const month = shown.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(shown);
  // Always render six weeks: month changes never resize or shift the card.
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= days ? day : null;
  });
  const monthStart = todayISO(new Date(year, month, 1));
  const monthEnd = todayISO(new Date(year, month + 1, 0));
  const { events } = useCalendarEvents(monthStart, monthEnd);
  const dayIso = (day: number) => todayISO(new Date(year, month, day));
  return <section className="dashboard-card calendar-card calendar-preview" aria-labelledby="calendar-title">
    <div className="section-card-heading">
      <div className="flex items-center gap-2.5"><span className="dashboard-icon icon-rose"><CalendarDays size={17}/></span><div><h2 id="calendar-title" className="text-base font-semibold">Календарь</h2><p className="text-xs text-ink-soft">Планы и памятные даты</p></div></div>
      <div className="calendar-month-control"><button type="button" onClick={()=>setOffset(v=>v-1)} aria-label="Предыдущий месяц" className="calendar-nav"><ChevronLeft size={16}/></button><span>{monthName}</span><button type="button" onClick={()=>setOffset(v=>v+1)} aria-label="Следующий месяц" className="calendar-nav"><ChevronRight size={16}/></button></div>
    </div>
    <div className="calendar-grid calendar-grid-preview" aria-label={monthName}>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(day=><span className="calendar-weekday" key={day}>{day}</span>)}
      {cells.map((day,index)=>{const first=day===null?undefined:eventsOnDay(events,dayIso(day))[0];return <span key={index} className={`calendar-day ${offset===0 && day===base.getDate()?"is-today":""} ${day===null?"is-empty":""}`} title={first?.title}>{day??""}{first&&<b className="cal-dot" style={{background:colorHex(first.color)}} aria-hidden="true"/>}</span>;})}
    </div>
    <Link href="/calendar" className="calendar-open-link">Открыть календарь <ArrowUpRight size={14}/></Link>
  </section>;
}
