import { CalendarDays, Link2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { VennBackdrop } from "@/components/couple/venn-backdrop";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LandingActions } from "@/components/layout/landing-actions";

const points = [
  { icon: CalendarDays, title: "Дни вместе", text: "Счётчик считается сам по дате начала отношений и меняется каждый день." },
  { icon: Link2, title: "Приглашение по ссылке", text: "Создайте пару и отправьте партнёру одноразовую ссылку. Она действует 7 дней." },
  { icon: ShieldCheck, title: "Только для двоих", text: "Пространство видите только вы и ваш партнёр. Посторонним оно недоступно." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-milk">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Logo />
        <ThemeToggle />
      </header>
      <main>
        <section className="relative isolate overflow-hidden">
          <VennBackdrop className="opacity-80" />
          <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pb-28 sm:pt-24">
            <h1 className="max-w-2xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Одно пространство на двоих
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Считайте дни, храните важные даты и видьте друг о друге то, что имеет значение. Без лишнего шума и без посторонних глаз.
            </p>
            <div className="mt-9">
              <LandingActions />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-5 pb-24">
          <ul className="grid gap-10 sm:grid-cols-3">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon className="size-6 text-accent-600" aria-hidden />
                <h2 className="mt-4 font-serif text-xl font-semibold">{title}</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
