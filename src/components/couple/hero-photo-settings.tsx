"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useHeroPhotoUrl } from "@/hooks/use-hero-photo";
import { GENERIC_ERROR } from "@/lib/errors";
import { HERO_PHOTO_ACCEPT, prepareHeroPhoto } from "@/lib/hero-photo";
import { removeHeroPhoto, setHeroBlur, setHeroPhoto } from "@/services/hero-photo";

/** Общее фото на карточке «Мы вместе уже»: загрузка, удаление и размытие. Видно вам обоим. */
export function HeroPhotoSettings() {
  const { couple, refresh } = useWorkspace();
  const url = useHeroPhotoUrl(couple?.hero_photo_path);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!couple) return null;
  const hasPhoto = Boolean(couple.hero_photo_path);
  const blur = couple.hero_photo_blur !== false;

  async function run(task: () => Promise<void>) {
    setBusy(true); setError("");
    try { await task(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  return (
    <div className="border-t border-sand-200 pt-6">
      <p className="font-medium">Общее фото на карточке «Мы вместе уже»</p>
      <p className="text-sm text-ink-soft">Фото увидите вы оба. Оно заменит узор на фоне карточки.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="hero-photo-thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden="true">{!url && <ImagePlus className="size-6 text-ink-faint" />}</div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={HERO_PHOTO_ACCEPT} className="sr-only" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(async () => { await setHeroPhoto(couple.id, await prepareHeroPhoto(file), couple.hero_photo_path ?? null); });
          }} />
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()} loading={busy}><ImagePlus className="size-4" aria-hidden /> {hasPhoto ? "Заменить фото" : "Выбрать фото"}</Button>
          {hasPhoto && <Button variant="ghost" size="sm" onClick={() => void run(() => removeHeroPhoto(couple.id, couple.hero_photo_path ?? null))} disabled={busy}><Trash2 className="size-4" aria-hidden /> Удалить</Button>}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div><p className="font-medium">Размытие фона</p><p className="text-sm text-ink-soft">Мягкое размытие делает текст на карточке читаемее.</p></div>
        <Switch checked={blur} onChange={(v) => void run(() => setHeroBlur(couple.id, v))} disabled={!hasPhoto || busy} label="Размытие фона" />
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </div>
  );
}
