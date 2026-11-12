"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ImagePlus, Loader2 } from "lucide-react";
import { AlbumLightbox } from "@/components/album/album-lightbox";
import { useAlbum, useAlbumUpload } from "@/components/album/use-album";
import { useWorkspace } from "@/components/providers/workspace-provider";

const SHOWN = 6;

/** Главная: последние фото альбома, быстрое добавление и просмотр на весь экран. */
export function AlbumPreview() {
  const { couple, profile, partner } = useWorkspace();
  const { photos, thumbs, total, error, reload } = useAlbum(SHOWN);
  const { run, progress, error: uploadError } = useAlbumUpload(() => void reload());
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  if (!couple || !profile) return null;

  const list = photos ?? [];
  const uploading = progress !== null;
  const nameOf = (id: string) => (id === profile.id ? "вы" : partner?.display_name ?? "партнёр");
  const message = error || uploadError;

  return (
    <section className="dashboard-card dash-preview">
      <div className="dash-preview-head">
        <p>{total > 0 ? `Фотографий в альбоме: ${total}` : "Общие фотографии, которые видите только вы двое"}</p>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1}
          onChange={(e) => { if (e.target.files?.length) void run(Array.from(e.target.files)); e.target.value = ""; }} />
        <button type="button" className="dash-write" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {uploading ? `${Math.min(progress.done + 1, progress.total)} из ${progress.total}…` : "Добавить"}
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-danger">{message}</p>}
      {photos === null ? (
        <p className="mt-3 text-sm text-ink-soft">Загружаем…</p>
      ) : list.length === 0 ? (
        <div className="dash-preview-empty"><ImagePlus size={28} aria-hidden /><p>Пока пусто. Добавьте первое фото: оно появится у партнёра сразу.</p></div>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {list.map((photo, index) => (
            <li key={photo.id}>
              <button type="button" onClick={() => setOpen(index)} aria-label={photo.caption ? `Открыть фото: ${photo.caption}` : "Открыть фото на весь экран"}
                className="block aspect-square w-full overflow-hidden rounded-xl bg-sand-100 ring-1 ring-sand-200">
                {thumbs[photo.thumb_path] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumbs[photo.thumb_path]} alt={photo.caption ?? ""} loading="lazy" className="size-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/album" className="calendar-open-link">Открыть альбом <ArrowUpRight size={14} /></Link>
      {open !== null && list.length > 0 && (
        <AlbumLightbox photos={list} thumbs={thumbs} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} onChanged={() => void reload()} nameOf={nameOf} />
      )}
    </section>
  );
}
