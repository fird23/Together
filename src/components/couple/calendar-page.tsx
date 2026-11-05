"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarPage() {
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState(() => new Date());
  const year=cursor.getFullYear(), month=cursor.getMonth();
  const first=(new Date(year,month,1).getDay()+6)%7;
  const count=new Date(year,month+1,0).getDate();
  const cells=Array.from({length:42},(_,i)=>{const n=i-first+1;return n>0&&n<=count?n:null;});
  const monthName=new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(cursor);
  const same=(a:Date,b:Date)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const today=new Date();
  return <main className="calendar-page-full">
    <Link href="/dashboard" className="calendar-back-link"><ArrowLeft size={16}/> На главную</Link>
    <header className="calendar-page-heading"><span className="dashboard-icon icon-rose"><CalendarDays size={22}/></span><div><p className="eyebrow">ВАШИ ОБЩИЕ ПЛАНЫ</p><h1 className="font-serif">Календарь</h1><p>Выбирайте дни и планируйте важные моменты вместе.</p></div></header>
    <section className="dashboard-card calendar-full-card">
      <div className="calendar-full-toolbar"><button className="calendar-nav" onClick={()=>setCursor(new Date(year,month-1,1))} aria-label="Предыдущий месяц"><ChevronLeft/></button><h2 className="font-serif">{monthName}</h2><button className="calendar-nav" onClick={()=>setCursor(new Date(year,month+1,1))} aria-label="Следующий месяц"><ChevronRight/></button><button className="calendar-today" onClick={()=>{setCursor(new Date());setSelected(new Date());}}>Сегодня</button></div>
      <div className="calendar-full-grid">{["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"].map(x=><div className="calendar-full-weekday" key={x}>{x}</div>)}{cells.map((day,i)=>{const date=day?new Date(year,month,day):null;return <button key={i} disabled={!date} onClick={()=>date&&setSelected(date)} className={`calendar-full-day ${date&&same(date,today)?"today":""} ${date&&same(date,selected)?"selected":""}`}>{day??""}</button>;})}</div>
      <div className="calendar-selected-date"><strong>{selected.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</strong><span>События и напоминания можно будет добавить в этот день.</span></div>
    </section>
  </main>;
}
