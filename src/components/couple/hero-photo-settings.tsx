"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useHeroPhotoUrl } from "@/hooks/use-hero-photo";
import { GENERIC_ERROR } from "@/lib/errors";
import { HERO_PHOTO_ACCEPT, prepareHeroPhoto } from "@/lib/hero-photo";
import { compressImage } from "@/lib/image";
import { addHeroPhoto, deleteHeroPhoto, heroBlurPx, heroPhotoUrls, listHeroPhotos, selectHeroPhoto, setHeroBlurAmount, setHeroEnabled, type HeroPhoto } from "@/services/hero-photo";
import { cn } from "@/utils/cn";

/** Пять уровней размытия вместо ползунка на 25 делений. */
const BLUR_LEVELS = [{ px: 0, label: "Нет" }, { px: 6, label: "Слабое" }, { px: 12, label: "Среднее" }, { px: 18, label: "Сильное" }, { px: 24, label: "Максимум" }];
const levelOf = (px: number) => BLUR_LEVELS.reduce((best, l, i) => (Math.abs(l.px - px) < Math.abs(BLUR_LEVELS[best].px - px) ? i : best), 0);

/** Фото на карточке «Мы вместе уже»: библиотека ваших и партнёра фото, выбор из прежних, отключение без удаления и размытие. */
export function HeroPhotoSettings() {
  const { couple, profile, partner, refresh } = useWorkspace();
  const enabled = couple?.hero_photo_enabled !== false;
  const currentPath = couple?.hero_photo_path ?? null;
  const url = useHeroPhotoUrl(currentPath);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftBlur, setDraftBlur] = useState<number | null>(null);
  const [library, setLibrary] = useState<HeroPhoto[] | null>(null);
  const [libraryMissing, setLibraryMissing] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const timer = useRef<number | null>(null);
  const coupleId = couple?.id;

  const loadLibrary = useCallback(async () => {
    if (!coupleId) return;
    try {
      const list = await listHeroPhotos(coupleId);
      setLibrary(list); setLibraryMissing(false);
      setThumbs(await heroPhotoUrls(list.map((p) => p.thumb_path ?? p.path)));
    } catch { setLibrary([]); setLibraryMissing(true); }
  }, [coupleId]);
  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  if (!couple || !profile) return null;
  const hasPhoto = Boolean(currentPath);
  const shownBlur = draftBlur ?? heroBlurPx(couple);
  const nameOf = (id: string | null) => (id === profile.id ? "вы" : id && partner && id === partner.id ? (partner.display_name ?? "партнёр") : "");

  async function run(task: () => Promise<void>) {
    setBusy(true); setError("");
    try { await task(); await refresh(); await loadLibrary(); } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  async function upload(file: File) {
    const main = await prepareHeroPhoto(file);
    let thumb: Blob | null = null;
    try { thumb = await compressImage(file, { maxSide: 360, maxBytes: 60 * 1024 }); } catch { /* миниатюра необязательна */ }
    await addHeroPhoto(couple!.id, profile!.id, main, thumb);
  }

  return (
    <div className="border-t border-sand-200 pt-6">
      <p className="font-medium">Фото на карточке «Мы вместе уже»</p>
      <p className="text-sm text-ink-soft">Фото увидите вы оба. Оно заменит узор на фоне карточки. Прежние фото сохраняются: их можно выбрать снова.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="hero-photo-thumb" aria-hidden="true">{url && enabled ? <i style={{ backgroundImage: `url("${url}")`, filter: `blur(${shownBlur * 0.45}px)`, transform: `scale(${1 + shownBlur / 55})` }} /> : <ImagePlus className="size-6 text-ink-faint" />}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <input ref={input} type="file" accept={HERO_PHOTO_ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(() => upload(file));
          }} />
          <div>
            <Button variant="secondary" size="sm" onClick={() => input.current?.click()} loading={busy}><ImagePlus className="size-4" aria-hidden /> Добавить новое фото</Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Показывать фото на карточке</p>
              <p className="text-xs text-ink-soft">{hasPhoto ? (enabled ? "Выключите, чтобы вернуть узор. Фото не удалится." : "Сейчас на карточке узор. Фото сохранено.") : "Сначала выберите или добавьте фото."}</p>
            </div>
            <Switch checked={hasPhoto && enabled} onChange={(v) => void run(() => setHeroEnabled(couple.id, v))} label="Показывать фото на карточке" disabled={!hasPhoto || busy} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">Ваши фото{library && library.length > 0 ? ` (${library.length})` : ""}</p>
        {libraryMissing ? (
          <p className="mt-1 text-sm text-ink-soft">Список фото недоступен: примените миграцию 029_hero_photo_library.sql.</p>
        ) : library === null ? (
          <p className="mt-1 text-sm text-ink-soft">Загружаем…</p>
        ) : library.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">Пока нет фото. Добавьте первое: оно появится здесь у вас обоих.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {library.map((photo) => {
              const current = photo.path === currentPath;
              const who = nameOf(photo.uploaded_by);
              const src = thumbs[photo.thumb_path ?? photo.path];
              return (
                <li key={photo.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => void run(() => selectHeroPhoto(couple.id, photo.path))}
                    disabled={busy}
                    aria-pressed={current && enabled}
                    aria-label={current ? "Это фото сейчас выбрано" : "Поставить это фото на карточку"}
                    className={cn("relative block aspect-square w-full overflow-hidden rounded-xl bg-sand-100 ring-1 ring-sand-200 transition focus-visible:outline-2 focus-visible:outline-accent-600", current && "ring-2 ring-accent-600")}
                  >
                    {src && /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt="" loading="lazy" className={cn("size-full object-cover", current && !enabled && "opacity-60")} />}
                    {who && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-5 text-left text-[10px] font-medium text-white">{who}</span>}
                    {current && <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold text-on-accent"><Check className="size-3" aria-hidden />{enabled ? "Сейчас" : "Выбрано"}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(current ? "Удалить это фото насовсем? Оно стоит на карточке и пропадёт у вас обоих." : "Удалить это фото насовсем? Оно пропадёт у вас обоих.")) void run(() => deleteHeroPhoto(couple.id, photo, current)); }}
                    disabled={busy}
                    aria-label="Удалить фото насовсем"
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/55 text-white opacity-100 transition hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  ><Trash2 className="size-3.5" aria-hidden /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0"><p className="font-medium">Размытие фона</p><p className="text-sm text-ink-soft">Размытие делает текст на карточке читаемее. Выберите подходящий уровень.</p></div>
          <output className="hero-blur-value" htmlFor="hero-blur">{BLUR_LEVELS[levelOf(shownBlur)].label}</output>
        </div>
        <input id="hero-blur" type="range" min={0} max={BLUR_LEVELS.length - 1} step={1} value={levelOf(shownBlur)} disabled={!hasPhoto || !enabled || busy} className="hero-blur-range" aria-label="Сила размытия фона"
          onChange={(e) => { const v = BLUR_LEVELS[Number(e.target.value)].px; setDraftBlur(v); if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => void run(async () => { await setHeroBlurAmount(couple.id, v); setDraftBlur(null); }), 450); }} />
        <div className="hero-blur-scale" aria-hidden="true"><span>без размытия</span><span>сильное</span></div>
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </div>
  );
}
