/**
 * Всё про даты отношений. Работаем с датами формата "YYYY-MM-DD" (без времени).
 * «Сегодня» берётся по часовому поясу пользователя, поэтому счётчик
 * меняется ровно в его полночь.
 * Счётчик ВСЕГДА вычисляется из даты начала, в базе число дней не хранится.
 */

const MS_PER_DAY = 86_400_000;

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function toUtc(iso: string): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

/** Сегодняшняя дата пользователя (по его часовому поясу) в формате YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Сколько полных дней прошло с даты начала. Не бывает меньше нуля. */
export function daysTogether(startISO: string, now: Date = new Date()): number {
  const diff = Math.floor((toUtc(todayISO(now)) - toUtc(startISO)) / MS_PER_DAY);
  return Math.max(0, diff);
}

/** Разбивка на годы, месяцы и дни (по календарю). */
export function breakdown(startISO: string, now: Date = new Date()) {
  if (daysTogether(startISO, now) === 0) return { years: 0, months: 0, days: 0 };
  const [sy, sm, sd] = parts(startISO);
  const [ey, em, ed] = parts(todayISO(now));
  let years = ey - sy;
  let months = em - sm;
  let days = ed - sd;
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(ey, em - 1, 0)).getUTCDate(); // дней в прошлом месяце
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** Склонение: pluralRu(5, ["день","дня","дней"]) → "дней". */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return forms[1];
  return forms[2];
}

export const DAYS_FORMS: [string, string, string] = ["день", "дня", "дней"];
const YEARS_FORMS: [string, string, string] = ["год", "года", "лет"];
const MONTHS_FORMS: [string, string, string] = ["месяц", "месяца", "месяцев"];

/** "1 год, 8 месяцев и 20 дней" */
export function describeBreakdown(startISO: string, now: Date = new Date()): string {
  const { years, months, days } = breakdown(startISO, now);
  const chunks: string[] = [];
  if (years) chunks.push(`${years} ${pluralRu(years, YEARS_FORMS)}`);
  if (months) chunks.push(`${months} ${pluralRu(months, MONTHS_FORMS)}`);
  if (days || chunks.length === 0) chunks.push(`${days} ${pluralRu(days, DAYS_FORMS)}`);
  if (chunks.length === 1) return chunks[0];
  return `${chunks.slice(0, -1).join(", ")} и ${chunks[chunks.length - 1]}`;
}

/**
 * Ближайшая «красивая» дата: кратная 100 дням или годовщина.
 * Возвращает и предыдущую отметку — для полоски прогресса.
 */
export function nextMilestone(days: number) {
  const nextHundred = (Math.floor(days / 100) + 1) * 100;
  const nextYear = (Math.floor(days / 365) + 1) * 365;
  const prevHundred = Math.floor(days / 100) * 100;
  const prevYear = Math.floor(days / 365) * 365;
  const target = Math.min(nextHundred, nextYear);
  const previous = Math.max(prevHundred, prevYear);
  const years = target % 365 === 0 ? target / 365 : null;
  const label = years ? `${years} ${pluralRu(years, YEARS_FORMS)}` : `${target} ${pluralRu(target, DAYS_FORMS)}`;
  return { target, previous, remaining: target - days, label };
}

/** "14 февраля 2024" */
export function formatDateRu(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(toUtc(iso)))
    .replace(/\s?г\.$/, "");
}

/* ===== Ближайшие важные даты ===== */

const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return isoOf(toUtc(iso) + days * MS_PER_DAY);
}

/** Прибавляет месяцы по календарю; 31 января + 1 месяц = 28/29 февраля, а не 3 марта. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return isoOf(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)));
}

export const addYears = (iso: string, years: number) => addMonths(iso, years * 12);

export type KeyDate = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** сколько дней осталось (0 — сегодня) */
  inDays: number;
  kind: "days" | "anniversary";
};

const DAY_MARKS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000,
];

const formatNumber = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

/**
 * Ближайшие памятные даты пары: круглые числа дней, полгода и годовщины.
 * Считается из даты начала отношений, в базе ничего не хранится.
 */
export function upcomingDates(startISO: string, now: Date = new Date(), count = 4): KeyDate[] {
  const today = todayISO(now);
  const todayMs = toUtc(today);
  const all: Omit<KeyDate, "inDays">[] = [];

  for (const n of DAY_MARKS) {
    all.push({ id: `d${n}`, kind: "days", title: `${formatNumber(n)} ${pluralRu(n, DAYS_FORMS)} вместе`, date: addDays(startISO, n) });
  }
  all.push({ id: "m6", kind: "days", title: "Полгода вместе", date: addMonths(startISO, 6) });
  for (let y = 1; y <= 60; y++) {
    all.push({
      id: `y${y}`,
      kind: "anniversary",
      title: y === 1 ? "Год вместе" : `${y} ${pluralRu(y, YEARS_FORMS)} вместе`,
      date: addYears(startISO, y),
    });
  }

  return all
    .filter((item) => item.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, count)
    .map((item) => ({ ...item, inDays: Math.round((toUtc(item.date) - todayMs) / MS_PER_DAY) }));
}

/** Сводка «вашего пути»: недели, полные месяцы, часы. */
export function togetherStats(startISO: string, now: Date = new Date()) {
  const days = daysTogether(startISO, now);
  const { years, months } = breakdown(startISO, now);
  return { days, weeks: Math.floor(days / 7), months: years * 12 + months, hours: days * 24 };
}

export const WEEKS_FORMS: [string, string, string] = ["неделя", "недели", "недель"];
export const MONTHS_FORMS_PUBLIC: [string, string, string] = ["месяц", "месяца", "месяцев"];
export const HOURS_FORMS: [string, string, string] = ["час", "часа", "часов"];
