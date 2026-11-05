import { Logo } from "@/components/layout/logo";

/** Показывается, если не заданы переменные окружения Supabase. */
export function SetupScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-milk px-5 py-10">
      <div className="w-full max-w-lg rounded-card bg-paper p-7 shadow-soft ring-1 ring-sand-200 sm:p-9">
        <Logo asText />
        <h1 className="mt-8 font-serif text-2xl font-semibold tracking-tight">Нужно подключить Supabase</h1>
        <p className="mt-2 text-ink-soft">Приложение не нашло ключи доступа к базе данных. Добавьте две переменные окружения:</p>
        <pre className="mt-5 overflow-x-auto rounded-control bg-sand-100 p-4 text-sm leading-7 text-ink">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="mt-5 text-sm text-ink-soft">
          Локально они лежат в файле <code className="rounded bg-sand-100 px-1.5 py-0.5">.env.local</code>, на Vercel
          добавляются в Project Settings → Environment Variables. Подробности в файле SETUP.md.
        </p>
      </div>
    </main>
  );
}
