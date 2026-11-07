"use client";

import { useState } from "react";
import { BarChart3, Gift, Heart, ListChecks, MessagesSquare, Target, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GENERIC_ERROR } from "@/lib/errors";
import { updateFeatures } from "@/services/features";
import { featureOn, type FeatureKey } from "@/utils/features";

const optional: { key: FeatureKey; title: string; text: string; icon: LucideIcon }[] = [
  { key: "habits", title: "Привычки", text: "Общие и личные привычки, серии и прогресс.", icon: Target },
  { key: "wishlist", title: "Вишлисты", text: "Списки желаний с личными отметками.", icon: Gift },
  { key: "todos", title: "Список дел", text: "Общие и личные дела со сроками.", icon: ListChecks },
  { key: "talk", title: "Разговоры", text: "Обидки, слова, вопросы и предложения друг другу, и ответ на них.", icon: MessagesSquare },
  { key: "gratitude", title: "Благодарности", text: "Одна строка в день и банка благодарности.", icon: Heart },
  { key: "weekly", title: "Итоги недели", text: "Сводка по привычкам, делам, настроению и благодарностям.", icon: BarChart3 },
];
/** Включение блоков для всей пары. Настройка общая: блок исчезает у обоих, данные при этом сохраняются. */
export function FeatureSettings() {
  const { couple, refresh } = useWorkspace();
  const [busy, setBusy] = useState<FeatureKey | null>(null);
  const [error, setError] = useState("");
  if (!couple) return null;

  async function toggle(key: FeatureKey, next: boolean) {
    if (!couple) return;
    setBusy(key); setError("");
    try {
      await updateFeatures(couple.id, { ...(couple.features ?? {}), [key]: next });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    }
    setBusy(null);
  }

  return (
    <div>
      <ul>
        {optional.map(({ key, title, text, icon: Icon }) => (
          <li key={key} className="flex items-center gap-4 border-b border-sand-100 py-3.5 first:pt-0 last:border-0 last:pb-0">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Icon className="size-5" aria-hidden /></span>
            <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="text-sm text-ink-soft">{text}</p></div>
            <Switch checked={featureOn(couple, key)} onChange={(v) => void toggle(key, v)} disabled={busy !== null} label={title} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">Настройка общая для вас обоих: отключённый блок исчезнет у партнёра тоже. Данные не удаляются, при повторном включении всё вернётся.</p>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </div>
  );
}
