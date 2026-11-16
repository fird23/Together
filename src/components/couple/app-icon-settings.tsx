"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { APP_ICONS, applyWebIcon, iconFile, isIconId, savedWebIcon, type AppIconId } from "@/lib/app-icons";
import { TogetherNative, isNativeApp } from "@/lib/native";
import { cn } from "@/utils/cn";

/** Выбор иконки. В приложении для Android иконка меняется на самом телефоне, на сайте задаёт иконку будущего ярлыка. */
export function AppIconSettings() {
  const native = isNativeApp();
  const [current, setCurrent] = useState<AppIconId>("classic");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!native) { setCurrent(savedWebIcon()); return; }
    TogetherNative.getAppIcon().then((r) => { if (isIconId(r.icon)) setCurrent(r.icon); }).catch(() => {});
  }, [native]);

  async function choose(id: AppIconId) {
    if (id === current || busy) return;
    setBusy(true); setMsg(null);
    try {
      if (native) {
        await TogetherNative.setAppIcon({ icon: id });
        setMsg({ ok: true, text: "Иконка сменится через несколько секунд. Ярлык, который вы вынесли на рабочий стол, может пропасть: добавьте приложение на рабочий стол заново." });
      } else {
        applyWebIcon(id);
        setMsg({ ok: true, text: "Иконка выбрана. Чтобы она появилась на экране «Домой», удалите старый ярлык Together и добавьте его заново." });
      }
      setCurrent(id);
    } catch {
      setMsg({ ok: false, text: "Не получилось сменить иконку. Обновите приложение до последней версии (нужна пересборка) и повторите." });
    }
    setBusy(false);
  }

  return (
    <div>
      <p className="font-medium">Иконка приложения</p>
      <p className="text-sm text-ink-soft">
        {native
          ? "Иконка Together на экране вашего телефона."
          : "На iPhone iOS запоминает иконку в момент добавления на экран «Домой», поэтому сменить её у уже добавленного ярлыка нельзя: выберите иконку здесь, удалите старый ярлык и добавьте Together заново (Поделиться → На экран «Домой»). В Chrome на Android так же. В приложении для Android иконка меняется на лету."}
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {APP_ICONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => void choose(id)}
              disabled={busy}
              aria-pressed={current === id}
              className={cn("relative flex w-full flex-col items-center gap-1.5 rounded-2xl p-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-accent-600", current === id ? "bg-accent-50 ring-2 ring-accent-600" : "ring-1 ring-sand-200 hover:bg-sand-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconFile(id, "icon-192.png")} alt="" className="size-14 rounded-[1.1rem]" width={56} height={56} />
              {label}
              {current === id && <Check className="absolute right-1.5 top-1.5 size-4 rounded-full bg-accent-600 p-0.5 text-on-accent" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
      {msg && <Alert tone={msg.ok ? "success" : "error"} className="mt-3">{msg.text}</Alert>}
    </div>
  );
}
