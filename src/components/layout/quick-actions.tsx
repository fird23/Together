"use client";

import Link from "next/link";
import { CalendarPlus, HeartHandshake, ListPlus, MessageSquarePlus, Smile, Target, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { featureOn } from "@/utils/features";

type Action = { href: string; label: string; text: string; icon: LucideIcon; show: boolean };

/** Быстрые действия по кнопке «+» в нижней навигации телефона. */
export function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { couple } = useWorkspace();
  const actions: Action[] = [
    { href: "/dashboard#mood", label: "Отметить настроение", text: "Как вы сегодня", icon: Smile, show: true },
    { href: "/calendar#new", label: "Новая пометка", text: "На один или несколько дней", icon: CalendarPlus, show: true },
    { href: "/todos#new", label: "Новое дело", text: "Добавить в общий список", icon: ListPlus, show: featureOn(couple, "todos") },
    { href: "/talk#new", label: "Написать партнёру", text: "Сказать, спросить, предложить", icon: MessageSquarePlus, show: featureOn(couple, "talk") },
    { href: "/dashboard#block-gratitude", label: "Благодарность дня", text: "За что вы благодарны сегодня", icon: HeartHandshake, show: featureOn(couple, "gratitude") },
    { href: "/habits", label: "Мои привычки", text: "Отметить выполненные", icon: Target, show: featureOn(couple, "habits") },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Быстрые действия">
      <ul className="-mx-1 space-y-1">
        {actions.filter((a) => a.show).map(({ href, label, text, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={onClose} className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-sand-100 focus-visible:bg-sand-100 focus-visible:outline-none">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Icon className="size-5" aria-hidden /></span>
              <span><span className="block font-semibold">{label}</span><span className="block text-sm text-ink-soft">{text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
