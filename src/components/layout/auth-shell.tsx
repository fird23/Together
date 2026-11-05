import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { VennBackdrop } from "@/components/couple/venn-backdrop";

/** Каркас страниц входа: слева образ будущего пространства, справа форма. На телефоне только форма. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <aside className="relative hidden overflow-hidden bg-accent-50 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <VennBackdrop />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <p className="font-serif text-5xl leading-[1.1] tracking-tight xl:text-6xl">
            Мы вместе уже
            <br />
            412 дней
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Так будет выглядеть ваше общее пространство: счётчик дней, важные даты и профиль партнёра.
          </p>
        </div>
        <p className="relative text-sm text-ink-soft">Его видите только вы двое.</p>
      </aside>
      <main className="flex min-w-0 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto my-auto w-full max-w-[400px] py-10">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight">{title}</h1>
      {description && <p className="mt-2.5 leading-relaxed text-ink-soft">{description}</p>}
    </div>
  );
}
