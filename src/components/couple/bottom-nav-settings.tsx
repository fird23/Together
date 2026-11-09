"use client";

import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useNavConfig } from "@/hooks/use-nav-config";
import { NAV_DEFS, NAV_IDS, type NavId } from "@/lib/nav-items";
import { MIN_NAV_ITEMS, addNavItem, maxNavItems, moveNavItem, removeNavItem, resetNav, setNavPlus } from "@/lib/nav-store";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";

/** Настройка нижней панели телефона: какие разделы, в каком порядке и нужна ли кнопка «+». Хранится на этом устройстве. */
export function BottomNavSettings() {
  const { couple } = useWorkspace();
  const { items, plus } = useNavConfig();
  const available = (id: NavId) => { const f = NAV_DEFS[id].feature; return !f || featureOn(couple, f); };
  const selected = items.filter(available);
  const rest = NAV_IDS.filter((id) => !items.includes(id) && available(id));
  const max = maxNavItems(plus);
  const full = items.length >= max;
  const split = plus ? Math.ceil(selected.length / 2) : selected.length;

  return (
    <div className="space-y-6">
      {/* Превью: так будет выглядеть панель на телефоне */}
      <div aria-hidden="true" className="rounded-2xl bg-milk p-3">
        <div className="flex items-end rounded-xl border border-sand-200 bg-paper px-1">
          {selected.map((id, i) => {
            const { icon: Icon, label } = NAV_DEFS[id];
            return (
              <div key={id} className="contents">
                {plus && i === split && <div className="flex flex-1 justify-center"><span className="-mt-4 mb-1.5 grid size-11 place-items-center rounded-full bg-accent-600 text-on-accent ring-4 ring-paper"><Plus className="size-5" /></span></div>}
                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-ink-soft">
                  <Icon className="size-[18px]" /><span className="max-w-full truncate">{label}</span>
                </div>
              </div>
            );
          })}
          {plus && split >= selected.length && <div className="flex flex-1 justify-center"><span className="-mt-4 mb-1.5 grid size-11 place-items-center rounded-full bg-accent-600 text-on-accent ring-4 ring-paper"><Plus className="size-5" /></span></div>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Кнопка «+» по центру</p>
          <p className="text-sm text-ink-soft">Быстрые действия: настроение, пометка, дело, сообщение. Без неё в панель помещается пять разделов, с ней — четыре.</p>
        </div>
        <Switch checked={plus} onChange={setNavPlus} label="Кнопка «+» в нижней панели" />
      </div>

      <div>
        <p className="mb-2 font-medium">В панели <span className="font-normal text-ink-soft">({items.length} из {max})</span></p>
        <ul className="space-y-2">
          {items.map((id, i) => {
            const { icon: Icon, label } = NAV_DEFS[id];
            const hidden = !available(id);
            return (
              <li key={id} className={cn("flex items-center gap-2 rounded-xl border border-sand-200 bg-paper p-2 pl-3", hidden && "opacity-50")}>
                <Icon className="size-5 shrink-0 text-accent-700" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{label}{hidden && <span className="ml-2 text-xs font-normal text-ink-faint">выключено в «Функциях»</span>}</span>
                <button type="button" onClick={() => moveNavItem(id, -1)} disabled={i === 0} aria-label={`${label}: выше`} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-sand-100 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button type="button" onClick={() => moveNavItem(id, 1)} disabled={i === items.length - 1} aria-label={`${label}: ниже`} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-sand-100 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                <button type="button" onClick={() => removeNavItem(id)} disabled={items.length <= MIN_NAV_ITEMS} aria-label={`Убрать «${label}» из панели`} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-30"><Minus className="size-4" /></button>
              </li>
            );
          })}
        </ul>
        {items.length <= MIN_NAV_ITEMS && <p className="mt-2 text-sm text-ink-soft">В панели должно остаться минимум {MIN_NAV_ITEMS} раздела.</p>}
      </div>

      {rest.length > 0 && (
        <div>
          <p className="mb-2 font-medium">Можно добавить</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {rest.map((id) => {
              const { icon: Icon, label } = NAV_DEFS[id];
              return (
                <li key={id}>
                  <button type="button" onClick={() => addNavItem(id)} disabled={full} className="flex h-12 w-full items-center gap-3 rounded-xl border border-dashed border-sand-300 px-3 text-left font-medium text-ink-soft transition-colors hover:border-accent-600 hover:text-accent-700 disabled:opacity-40">
                    <Icon className="size-5 shrink-0" aria-hidden /><span className="min-w-0 flex-1 truncate">{label}</span><Plus className="size-4 shrink-0" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          {full && <p className="mt-2 text-sm text-ink-soft">Панель заполнена: уберите один раздел, чтобы добавить другой.</p>}
        </div>
      )}

      <button type="button" onClick={resetNav} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-soft hover:bg-sand-100"><RotateCcw className="size-4" aria-hidden />Вернуть как было</button>
      <p className="text-sm text-ink-faint">Настройка хранится на этом устройстве: на каждом телефоне панель можно собрать по-своему.</p>
    </div>
  );
}
