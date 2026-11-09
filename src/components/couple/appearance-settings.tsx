"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { usePatterns } from "@/hooks/use-patterns";
import { Switch } from "@/components/ui/switch";
import { HeroPhotoSettings } from "@/components/couple/hero-photo-settings";
import { THEMES, type ModePreference } from "@/lib/themes";
import { cn } from "@/utils/cn";

const modes: { id: ModePreference; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Светлая", icon: Sun },
  { id: "dark", label: "Тёмная", icon: Moon },
  { id: "system", label: "Как в системе", icon: Monitor },
];

/** Выбор режима (светлая / тёмная / как в системе) и цветовой темы. Настройки хранятся на этом устройстве. */
export function AppearanceSettings() {
  const { theme, mode, resolved, setTheme, setMode } = useTheme();
  const { on: patterns, setOn: setPatterns } = usePatterns();

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-3 font-medium">Режим</legend>
        <div className="grid grid-cols-3 gap-1 rounded-control bg-sand-100 p-1">
          {modes.map(({ id, label, icon: Icon }) => (
            <label key={id} className="relative cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={id}
                checked={mode === id}
                onChange={() => setMode(id)}
                className="peer sr-only"
              />
              <span className="flex h-11 items-center justify-center gap-2 rounded-[0.65rem] px-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink peer-checked:bg-paper peer-checked:text-ink peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-600">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-medium">Цветовая тема</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((item) => {
            const selected = theme === item.id;
            return (
              <label key={item.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={item.id}
                  checked={selected}
                  onChange={() => setTheme(item.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block rounded-card p-2 ring-1 ring-sand-200 transition-shadow hover:ring-sand-300",
                    "peer-checked:ring-2 peer-checked:ring-accent-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-600",
                  )}
                >
                  {/* Превью красится своей темой: атрибуты data-* на самом элементе подключают её цвета */}
                  <span data-theme={item.id} data-mode={resolved} className="block rounded-control bg-milk p-2.5">
                    <span className="block rounded-lg bg-paper p-2.5 shadow-soft ring-1 ring-sand-200">
                      <span className="flex gap-1.5">
                        <i className="size-3.5 rounded-full bg-accent-600" />
                        <i className="size-3.5 rounded-full bg-accent-300" />
                        <i className="size-3.5 rounded-full bg-accent-100" />
                      </span>
                      <span className="mt-2.5 block h-1.5 w-4/5 rounded-full bg-ink" />
                      <span className="mt-1.5 block h-1.5 w-3/5 rounded-full bg-sand-300" />
                    </span>
                  </span>
                  <span className="mt-2 flex items-center justify-between px-1.5 pb-0.5 text-sm font-medium">
                    {item.name}
                    {selected && <Check className="size-4 text-accent-700" aria-hidden />}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="text-sm text-ink-faint">Оформление запоминается на этом устройстве. У каждого из вас может быть своё.</p>

      <div className="flex items-center justify-between gap-4 border-t border-sand-200 pt-6">
        <div className="min-w-0">
          <p className="font-medium">Узоры на фоне карточки «Мы вместе уже»</p>
          <p className="text-sm text-ink-soft">В каждой теме свой узор. Если выключить, останутся два круга, как в логотипе.</p>
        </div>
        <Switch checked={patterns} onChange={setPatterns} label="Узоры на фоне" />
      </div>

      <HeroPhotoSettings />
    </div>
  );
}
