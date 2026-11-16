"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getAdminErrors, getAdminOverview } from "@/services/admin";
import type { AdminOverview, DayCount, ErrorGroup } from "@/types";

const USAGE_LABELS: Record<string, string> = {
  habit_checkins: "Отметки привычек", todos_done: "Выполнено дел", moods: "Настроения", gratitude: "Благодарности", talk_threads: "Новые разговоры",
  talk_replies: "Ответы в разговорах", calendar_events: "События календаря", wishes: "Желания в вишлистах", album_items: "Фото и видео в альбоме",
};
const FEATURE_LABELS: Record<string, string> = {
  habits: "Привычки", wishlist: "Вишлисты", todos: "Дела", talk: "Разговоры", gratitude: "Благодарности", weekly: "Итоги недели", memories: "Воспоминания", album: "Фотоальбом", stats: "Статистика",
};
const PLATFORM_LABELS: Record<string, string> = {
  "android-app": "Приложение Android", "android-web": "Браузер на Android", "android-pwa": "Сайт на экране «Домой» (Android)", "ios-web": "Браузер на iPhone", "ios-pwa": "Сайт на экране «Домой» (iPhone)", desktop: "Компьютер", "нет данных": "Нет данных",
};
const BUCKET_LABELS: Record<string, string> = {
  "album-media": "Альбом", "talk-media": "Разговоры", "couple-photos": "Фото карточки", "wishlist-media": "Вишлисты", "support-media": "Поддержка", avatars: "Аватары",
};
const FREE_QUOTA = 1024 * 1024 * 1024; // бесплатный тариф Supabase: 1 ГБ хранилища

const mb = (b: number) => (b / 1024 / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const when = (iso: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayShort = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card padding="sm">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </Card>
  );
}

function Bars({ data, label }: { data: DayCount[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.users));
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-28 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dayShort(d.day)}: ${d.users}`}>
            <span className="mb-0.5 text-center text-[10px] font-semibold tabular-nums text-ink-soft">{d.users || ""}</span>
            <div className="w-full rounded-t-md bg-accent-600/80" style={{ height: `${Math.max(d.users ? 6 : 2, (d.users / max) * 82)}%`, opacity: d.users ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => <span key={d.day} className="min-w-0 flex-1 text-center text-[9px] text-ink-faint">{i % 2 === 0 ? dayShort(d.day) : ""}</span>)}
      </div>
    </div>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm"><span className="min-w-0 text-ink-soft">{left}</span><span className="shrink-0 font-semibold tabular-nums">{right}</span></li>;
}

/** Расширенный отчёт администратора: пользователи, активность, использование, платформы, хранилище, уведомления, ошибки. Только агрегаты. */
export function AdminOverviewPanels({ onMissing }: { onMissing: () => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [errors, setErrors] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.all([getAdminOverview(), getAdminErrors()]).then(([o, e]) => {
      if (!alive) return;
      setData(o); setErrors(e); setLoading(false);
      if (!o) onMissing();
    });
    return () => { alive = false; };
  }, [onMissing]);

  if (loading) return <p className="mb-8 text-sm text-ink-soft">Загружаем отчёт…</p>;
  if (!data) return <p className="mb-8 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-soft">Расширенный отчёт появится после применения миграции 035_admin_overview.sql.</p>;

  const { users, couples, usage_7d: usage, push, support } = data;
  const totalBytes = Object.values(data.storage).reduce((s, b) => s + b.bytes, 0);
  const quotaShare = Math.min(100, (totalBytes / FREE_QUOTA) * 100);
  const featuresOff = Object.entries(data.features_off);

  return (
    <div className="mb-8 space-y-8">
      <section aria-labelledby="ov-main">
        <h2 id="ov-main" className="mb-3 font-serif text-xl font-semibold">Сводка</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Пользователи" value={users.total} hint={`новых: ${users.new_7d} за 7 дней, ${users.new_30d} за 30`} />
          <Tile label="Активны сегодня" value={users.active_today} hint={`за 7 дней: ${users.active_7d}, за 30: ${users.active_30d}`} />
          <Tile label="Пары" value={couples.total} hint={`вдвоём: ${couples.complete}, ждут партнёра: ${couples.single}`} />
          <Tile label="Активные пары" value={couples.active_7d} hint={`за 30 дней: ${couples.active_30d}`} />
        </div>
        {users.never_seen > 0 && <p className="mt-2 text-xs text-ink-faint">Заходов не зафиксировано у {users.never_seen} чел.: счётчики активности считаются с момента применения миграций 025/035.</p>}
      </section>

      <section aria-labelledby="ov-activity" className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 id="ov-activity" className="mb-3 text-sm font-semibold">Заходы по дням (14 дней)</h2>
          <Bars data={data.dau} label="Число пользователей, заходивших в приложение по дням" />
        </Card>
        <Card padding="md">
          <h2 className="mb-3 text-sm font-semibold">Новые пользователи (14 дней)</h2>
          <Bars data={data.signups} label="Число регистраций по дням" />
        </Card>
      </section>

      <section aria-labelledby="ov-usage">
        <h2 id="ov-usage" className="mb-3 font-serif text-xl font-semibold">Что делают за 7 дней</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.keys(USAGE_LABELS).map((k) => <Tile key={k} label={USAGE_LABELS[k]} value={usage[k] ?? 0} />)}
        </div>
        {featuresOff.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            Пары отключили функции: {featuresOff.map(([k, n]) => `${FEATURE_LABELS[k] ?? k} (${n})`).join(", ")}.
          </p>
        )}
      </section>

      <section aria-labelledby="ov-where" className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 id="ov-where" className="mb-1 text-sm font-semibold">Платформы (за 30 дней)</h2>
          <ul className="divide-y divide-sand-200">
            {Object.entries(data.platforms).sort((a, b) => b[1] - a[1]).map(([k, n]) => <Row key={k} left={PLATFORM_LABELS[k] ?? k} right={n} />)}
            {Object.keys(data.platforms).length === 0 && <li className="py-2 text-sm text-ink-faint">Пока нет данных.</li>}
          </ul>
        </Card>
        <Card padding="md">
          <h2 className="mb-1 text-sm font-semibold">Версии сайта у пользователей</h2>
          <ul className="divide-y divide-sand-200">
            {data.builds.map((b) => <Row key={b.build} left={<code className="text-xs">{b.build}</code>} right={b.users} />)}
            {data.builds.length === 0 && <li className="py-2 text-sm text-ink-faint">Пока нет данных.</li>}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">Хеш коммита с Vercel. Если у кого-то старая версия, обновления не дошли до устройства.</p>
        </Card>
      </section>

      <section aria-labelledby="ov-storage" className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 id="ov-storage" className="mb-1 text-sm font-semibold">Хранилище</h2>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-valuenow={Math.round(quotaShare)} aria-valuemin={0} aria-valuemax={100} aria-label="Занято из 1 ГБ">
            <div className={`h-full rounded-full ${quotaShare > 80 ? "bg-danger" : "bg-accent-600"}`} style={{ width: `${quotaShare}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">{mb(totalBytes)} МБ из 1024 МБ (бесплатный тариф Supabase){quotaShare > 80 ? ". Место заканчивается: удалите лишнее или перейдите на платный тариф." : "."}</p>
          <ul className="mt-2 divide-y divide-sand-200">
            {Object.entries(data.storage).sort((a, b) => b[1].bytes - a[1].bytes).map(([bucket, v]) => <Row key={bucket} left={`${BUCKET_LABELS[bucket] ?? bucket}, файлов: ${v.files}`} right={`${mb(v.bytes)} МБ`} />)}
          </ul>
        </Card>
        <Card padding="md">
          <h2 className="mb-1 text-sm font-semibold">Уведомления и альбом</h2>
          <ul className="divide-y divide-sand-200">
            <Row left="Пользователей с Android-устройством" right={push.android_devices} />
            <Row left="Пользователей с подпиской в браузере" right={push.web_users} />
            <Row left="Сохранили настройки уведомлений" right={push.prefs_users} />
            <Row left="Уведомлений в списках (всего / не прочитано)" right={`${push.inbox_total} / ${push.inbox_unread}`} />
            <Row left="Альбом: фото / видео" right={`${data.album.photos} / ${data.album.videos}`} />
          </ul>
        </Card>
      </section>

      <section aria-labelledby="ov-support" className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 id="ov-support" className="mb-1 text-sm font-semibold">Поддержка</h2>
          <ul className="divide-y divide-sand-200">
            <Row left="Открытых обращений" right={support.open} />
            <Row left="Среднее время до ответа" right={support.avg_reply_hours === null ? "нет данных" : `${support.avg_reply_hours} ч`} />
            <Row left="Самое старое открытое" right={support.oldest_open_days === null ? "нет" : `${support.oldest_open_days} дн.`} />
          </ul>
        </Card>
        <Card padding="md">
          <h2 className="mb-1 text-sm font-semibold">Ошибки приложения</h2>
          <ul className="divide-y divide-sand-200">
            <Row left="За сутки" right={data.errors.last_24h} />
            <Row left="За 7 дней" right={data.errors.last_7d} />
          </ul>
        </Card>
      </section>

      <section aria-labelledby="ov-errors">
        <h2 id="ov-errors" className="mb-3 font-serif text-xl font-semibold">Повторяющиеся ошибки</h2>
        {errors.length === 0 ? (
          <p className="text-sm text-ink-faint">За неделю ошибок не было.</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={e.message} className="rounded-xl bg-paper p-3 ring-1 ring-sand-200">
                <details>
                  <summary className="cursor-pointer text-sm font-medium [overflow-wrap:anywhere]">{e.message}</summary>
                  <p className="mt-1.5 text-xs text-ink-soft">Раз: {e.n}, пользователей: {e.users}, последний: {when(e.last_at)}{e.path ? `, страница ${e.path}` : ""}{e.build ? `, версия ${e.build}` : ""}</p>
                  {e.stack && <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-sand-100 p-2 text-[11px] leading-snug">{e.stack}</pre>}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
