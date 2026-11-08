"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Gift, Settings, Smile, Target, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustrations";
import { useWorkspace } from "@/components/providers/workspace-provider";

const features: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Smile, title: "Настроение", text: "Отмечайте, как вы сегодня, и подписывайте это парой слов." },
  { icon: Target, title: "Привычки", text: "Общие и личные, с сериями и прогрессом за день." },
  { icon: CalendarDays, title: "Календарь", text: "Пометки на один или несколько дней. Правая кнопка мыши открывает меню." },
  { icon: Gift, title: "Вишлисты", text: "Ваши желания и личные отметки на желаниях партнёра, их он не увидит." },
];

const STEPS = ["Добро пожаловать в Together", "Что здесь есть", "Всё под рукой"] as const;

/** Короткое приветствие при первом входе. Показывается один раз на устройство. */
export function WelcomeTour() {
  const { profile } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const key = profile ? `together-tour-v1-${profile.id}` : null;

  useEffect(() => {
    if (!key) return;
    try { if (!window.localStorage.getItem(key)) setOpen(true); } catch { /* без хранилища просто не показываем */ }
  }, [key]);

  function finish() {
    if (key) try { window.localStorage.setItem(key, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  return (
    <Modal open={open} onClose={finish} title={STEPS[step]}>
      <div className="tour-body">
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <Illustration kind="welcome" className="h-28 w-36" />
            <p className="mt-3 leading-relaxed text-ink-soft">Это ваше общее пространство для двоих: считайте дни вместе, планируйте, поддерживайте друг друга маленькими шагами. Покажем главное за полминуты.</p>
          </div>
        )}
        {step === 1 && (
          <ul className="space-y-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Icon className="size-5" aria-hidden /></span>
                <div><p className="font-semibold">{title}</p><p className="text-sm leading-relaxed text-ink-soft">{text}</p></div>
              </li>
            ))}
          </ul>
        )}
        {step === 2 && (
          <ul className="space-y-3">
            <li className="flex items-start gap-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Settings className="size-5" aria-hidden /></span><div><p className="font-semibold">Меню профиля</p><p className="text-sm leading-relaxed text-ink-soft">Наведите на аватарку справа вверху: профиль, настройки, поддержка и выход.</p></div></li>
            <li className="flex items-start gap-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Bell className="size-5" aria-hidden /></span><div><p className="font-semibold">Уведомления</p><p className="text-sm leading-relaxed text-ink-soft">В настройках можно включить напоминания о привычках и особых днях.</p></div></li>
            <li className="flex items-start gap-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Target className="size-5" aria-hidden /></span><div><p className="font-semibold">Только нужное</p><p className="text-sm leading-relaxed text-ink-soft">Привычки и вишлисты можно отключить для вас обоих, если они не нужны.</p></div></li>
          </ul>
        )}

        <div className="tour-dots" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}</div>
        <div className="mt-6 flex items-center justify-between gap-3">
          {step === 0 ? <Button variant="ghost" onClick={finish}>Пропустить</Button> : <Button variant="ghost" onClick={() => setStep(step - 1)}>Назад</Button>}
          {step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>Далее</Button> : <Button onClick={finish}>Начать</Button>}
        </div>
      </div>
    </Modal>
  );
}
