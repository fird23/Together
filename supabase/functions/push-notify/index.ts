// Edge Function: отправляет push-уведомления.
//  • по расписанию (cron, раз в час): напоминания о привычках, памятные даты, события календаря;
//  • по событию в базе: партнёр отметил настроение / выполнил привычку.
// Для телефона (Android) нужен только секрет FIREBASE_SERVICE_ACCOUNT.
// Уведомления в браузере (VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY) необязательны.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// deno-lint-ignore no-explicit-any
let webpushLib: any = undefined;
/** Библиотека веб-пуша подключается, только если заданы ключи VAPID. */
// deno-lint-ignore no-explicit-any
async function webPush(): Promise<any | null> {
  if (webpushLib !== undefined) return webpushLib;
  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return (webpushLib = null);
  const mod = await import("npm:web-push@3.6.7");
  mod.default.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com", pub, priv);
  return (webpushLib = mod.default);
}

type Payload = { title: string; body: string; url?: string; tag?: string };
const MORNING_HOUR = 9;
const MOODS: Record<string, string> = { great: "🤩 Прекрасно", good: "😊 Хорошо", calm: "😌 Спокойно", tired: "😴 Без сил", sad: "🥺 Грустно", stressed: "😰 Тревожно" };

/* ---------- Android (Firebase Cloud Messaging, HTTP v1) ---------- */
const b64url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
let fcmCache: { token: string; projectId: string; exp: number } | null = null;

async function fcmAccess(): Promise<{ token: string; projectId: string } | null> {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return null;
  if (fcmCache && fcmCache.exp > Date.now() + 60_000) return fcmCache;
  const account = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))}`;
  const der = Uint8Array.from(atob(String(account.private_key).replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(signature)}` }),
  });
  if (!res.ok) { console.error("FCM auth failed", await res.text()); return null; }
  const json = await res.json();
  fcmCache = { token: json.access_token, projectId: account.project_id, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return fcmCache;
}

/** Возвращает false, если токен устарел и его нужно удалить. */
async function sendFcm(token: string, payload: Payload): Promise<boolean> {
  const access = await fcmAccess();
  if (!access) return true;
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${access.projectId}/messages:send`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${access.token}` },
    body: JSON.stringify({ message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url ?? "/dashboard", tag: payload.tag ?? "" },
      android: { priority: "HIGH", notification: { channel_id: "together_default", tag: payload.tag, icon: "ic_stat_notify", color: "#4A52A3" } },
    } }),
  });
  if (res.ok) return true;
  const text = await res.text();
  return !(res.status === 404 || text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT"));
}

async function push(userId: string, payload: Payload) {
  const { data: devices } = await sb.from("device_tokens").select("id,token").eq("user_id", userId);
  for (const d of devices ?? []) {
    try { if (!(await sendFcm(d.token, payload))) await sb.from("device_tokens").delete().eq("id", d.id); } catch (e) { console.error("FCM error", e); }
  }

  const webpush = await webPush();
  if (!webpush) return;
  const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId);
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id); // устройство отписалось
    }
  }
}

/** Местная дата и час в часовом поясе пользователя. */
function localNow(tz: string) {
  let zone = tz;
  try { new Intl.DateTimeFormat("en", { timeZone: zone }); } catch { zone = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/* Памятные даты: те же правила, что в src/utils/days.ts */
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => isoOf(ms(iso) + n * 86_400_000);
function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return isoOf(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last)));
}
const DAY_MARKS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];
function keyDateToday(start: string, today: string): string | null {
  for (const n of DAY_MARKS) if (addDays(start, n) === today) return `${n} дней вместе`;
  if (addMonths(start, 6) === today) return "полгода вместе";
  for (let y = 1; y <= 60; y++) if (addMonths(start, y * 12) === today) return y === 1 ? "год вместе" : `${y} лет вместе`;
  return null;
}

/** Начинается ли пометка (с учётом повтора) в этот день. */
function startsOn(start: string, repeat: string, date: string): boolean {
  if (date < start) return false;
  if (repeat === "none" || !repeat) return start === date;
  if (repeat === "weekly") return (ms(date) - ms(start)) / 86_400_000 % 7 === 0;
  const months = repeat === "yearly" ? 12 : 1;
  const [y1, m1] = start.split("-").map(Number), [y2, m2] = date.split("-").map(Number);
  const diff = (y2 - y1) * 12 + (m2 - m1);
  return diff % months === 0 && addMonths(start, diff) === date;
}

async function runCron() {
  const [{ data: prefs }, { data: members }, { data: subs }, { data: tokens }, { data: couples }] = await Promise.all([
    sb.from("notification_prefs").select("*"),
    sb.from("couple_members").select("user_id,couple_id"),
    sb.from("push_subscriptions").select("user_id"),
    sb.from("device_tokens").select("user_id"),
    sb.from("couples").select("id,start_date,features"),
  ]);
  // Получатели: у кого включён пуш в браузере или в приложении на телефоне
  const subscribed = new Set([...(subs ?? []), ...(tokens ?? [])].map((s) => s.user_id));
  const coupleOfUser = new Map((members ?? []).map((m) => [m.user_id, m.couple_id]));
  const coupleById = new Map((couples ?? []).map((c) => [c.id, c]));

  for (const p of prefs ?? []) {
    if (!subscribed.has(p.user_id)) continue;
    const couple = coupleById.get(coupleOfUser.get(p.user_id));
    if (!couple) continue;
    const { date, hour } = localNow(p.timezone);

    if (p.habits && hour === p.habits_hour && couple.features?.habits !== false) {
      const { data: habits } = await sb.from("habits").select("id,week_days,per_week").eq("couple_id", couple.id).or(`scope.eq.shared,owner_id.eq.${p.user_id}`);
      const weekday = ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
      // «По дням»: сегодня не по расписанию — не напоминаем
      const scheduled = (habits ?? []).filter((h) => !(h.week_days?.length) || h.week_days.includes(weekday));
      const ids = scheduled.map((h) => h.id);
      if (ids.length) {
        const weekFrom = addDays(date, -(weekday - 1));
        const { data: marks } = await sb.from("habit_checkins").select("habit_id,day").in("habit_id", ids).eq("user_id", p.user_id).gte("day", weekFrom).lte("day", date);
        const doneToday = new Set((marks ?? []).filter((m) => m.day === date).map((m) => m.habit_id));
        const weekCount = (id: string) => (marks ?? []).filter((m) => m.habit_id === id).length;
        // «N в неделю»: норма уже выполнена — не напоминаем
        const left = scheduled.filter((h) => !doneToday.has(h.id) && !(h.per_week && weekCount(h.id) >= h.per_week)).length;
        if (left > 0) await push(p.user_id, { title: "Привычки", body: left === 1 ? "Осталась одна привычка на сегодня" : `Осталось привычек на сегодня: ${left}`, url: "/dashboard", tag: "habits" });
      }
    }

    if (hour === MORNING_HOUR) {
      if (p.dates) {
        const label = keyDateToday(couple.start_date, date);
        if (label) await push(p.user_id, { title: "Особенный день 🎉", body: `Сегодня ${label}!`, url: "/dashboard", tag: "dates" });
      }
      if (p.events) {
        const { data: events } = await sb.from("calendar_events").select("title,start_day,repeat").eq("couple_id", couple.id).or(`start_day.eq.${date},repeat.neq.none`);
        const today = (events ?? []).filter((e) => startsOn(e.start_day, e.repeat, date));
        if (today.length) await push(p.user_id, { title: "Сегодня в календаре", body: today.map((e) => e.title).join(", "), url: `/calendar?date=${date}`, tag: "events" });
      }
    }
  }
}

/** Проверка: отправляет тестовое уведомление на все подключённые устройства. */
async function runTest() {
  const [{ data: tokens }, { data: subs }] = await Promise.all([sb.from("device_tokens").select("user_id"), sb.from("push_subscriptions").select("user_id")]);
  const users = new Set([...(tokens ?? []), ...(subs ?? [])].map((r) => r.user_id));
  for (const id of users) await push(id, { title: "Together", body: "Проверка уведомлений: всё работает 💜", url: "/dashboard", tag: "test" });
  return users.size;
}

async function partnerOf(coupleId: string, userId: string) {
  const { data } = await sb.from("couple_members").select("user_id").eq("couple_id", coupleId).neq("user_id", userId).maybeSingle();
  return data?.user_id as string | undefined;
}
const nameOf = async (id: string) => (await sb.from("profiles").select("display_name").eq("id", id).maybeSingle()).data?.display_name ?? "Партнёр";

async function runWebhook(body: { type: string; table: string; record: Record<string, string>; old_record?: Record<string, string> }) {
  const r = body.record;
  if (body.table === "mood_entries") {
    if (body.type === "UPDATE" && body.old_record?.mood === r.mood) return; // изменили только комментарий
    const partner = await partnerOf(r.couple_id, r.user_id);
    if (!partner) return;
    const { data: prefs } = await sb.from("notification_prefs").select("partner_mood").eq("user_id", partner).maybeSingle();
    if (prefs?.partner_mood === false) return;
    await push(partner, { title: `${await nameOf(r.user_id)}: настроение`, body: `${MOODS[r.mood] ?? r.mood}${r.note ? ` — ${r.note}` : ""}`, url: "/dashboard", tag: "mood" });
  }
  if (body.table === "habit_checkins") {
    const { data: habit } = await sb.from("habits").select("title,couple_id").eq("id", r.habit_id).maybeSingle();
    if (!habit) return;
    const partner = await partnerOf(habit.couple_id, r.user_id);
    if (!partner) return;
    const { data: prefs } = await sb.from("notification_prefs").select("partner_habits").eq("user_id", partner).maybeSingle();
    if (!prefs?.partner_habits) return; // по умолчанию выключено
    await push(partner, { title: "Привычки", body: `${await nameOf(r.user_id)} выполнил(а): ${habit.title}`, url: "/dashboard", tag: "partner-habit" });
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });
  try {
    const body = await req.json();
    if (body.type === "test") return new Response(`test sent to ${await runTest()} user(s)`);
    if (body.type === "cron") await runCron(); else await runWebhook(body);
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
