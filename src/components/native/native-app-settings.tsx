"use client";

import { useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TogetherNative } from "@/lib/native";

/** Настройки, доступные только в Android-приложении: виджет на главный экран. */
export function NativeAppSettings() {
  const [state, setState] = useState<"idle" | "asked" | "manual" | "old">("idle");

  async function add() {
    try { setState((await TogetherNative.pinWidget()).requested ? "asked" : "manual"); }
    catch { setState("old"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-milk p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Виджет «Мы вместе»</p>
          <p className="text-sm text-ink-soft">Дни вместе, сколько привычек осталось на сегодня и ближайшее событие прямо на главном экране телефона.</p>
        </div>
        <Button size="sm" onClick={() => void add()} className="shrink-0"><LayoutDashboard className="size-4" aria-hidden /> Добавить виджет</Button>
      </div>
      {state === "asked" && <Alert tone="info">Подтвердите добавление в окне телефона.</Alert>}
      {state === "manual" && <Alert tone="info">Ваш экран не поддерживает быстрое добавление. Удерживайте пустое место на главном экране, выберите «Виджеты» и найдите Together.</Alert>}
      {state === "old" && <Alert tone="info">Для виджета нужна новая версия приложения: пересоберите и установите APK (см. NATIVE_SETUP.md).</Alert>}
      <p className="text-sm text-ink-soft">Число дней обновляется само. Привычки и событие обновляются, когда вы открываете приложение или что-то меняется у пары.</p>
    </div>
  );
}
