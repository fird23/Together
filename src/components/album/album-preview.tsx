"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ImagePlus, Loader2, Play } from "lucide-react";
import { AlbumLightbox } from "@/components/album/album-lightbox";
import { AlbumUploadDialog } from "@/components/album/album-upload-dialog";
import { useAlbum, useAlbumUpload } from "@/components/album/use-album";
import { isVideo } from "@/lib/video";
import { useWorkspace } from "@/components/providers/workspace-provider";

const SHOWN = 6;

/** Главная: последние фото альбома, быстрое добавление и просмотр на весь экран. */
export function AlbumPreview() {
  const { couple, profile, partner } = useWorkspace();
  const { photos, thumbs, total, error, reload } = useAlbum(SHOWN);
  const { run, progress, error: uploadError } = useAlbumUpload(() => void reload());
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pending, setPending] = useState<File[] | null>(null);
  if (!couple || !profile) return null;

  const list = photos ?? [];
  const uploading = progress !== null;
  const nameOf = (id: string) => (id === profile.id ? "вы" : partner?.display_name ?? "партнёр");
  const message = error || uploadError;

  return (
    <section className="dashboard-card dash-preview">
      <div className="dash-preview-head">
        <p>{total > 0 ? `В альбоме: ${total}` : "Общие фотографии, которые видите только вы двое"}</p>
        <input ref={input} type="file" accept="image/*,video/*" multiple className="sr-only" tabIndex={-1}
          onChange={(e) => { const images = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/") || isVideo(f)); if (images.length) setPending(images); e.target.value = ""; }} />
        <button type="button" className="dash-write" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {uploading ? `${progress.stage ?? ""}${progress.fraction !== undefined ? ` ${Math.round(progress.fraction * 100)}%` : ""} ${Math.min(progress.done + 1, progress.total)}/${progress.total}`.trim() : "Добавить"}
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-danger">{message}</p>}
      {photos === null ? (
        <p className="mt-3 text-sm text-ink-soft">Загружаем…</p>
      ) : list.length === 0 ? (
        <div className="dash-preview-empty"><ImagePlus size={28} aria-hidden /><p>Пока пусто. Добавьте первое фото или видео: оно появится у партнёра сразу.</p></div>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {list.map((photo, index) => (
            <li key={photo.id}>
              <button type="button" onClick={() => setOpen(index)} aria-label={photo.caption ? `Открыть: ${photo.caption}` : photo.kind === "video" ? "Открыть видео" : "Открыть фото на весь экран"}
                className="relative block aspect-square w-full overflow-hidden rounded-xl bg-sand-100 ring-1 ring-sand-200">
                {thumbs[photo.thumb_path] && photo.thumb_path !== photo.media_path && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumbs[photo.thumb_path]} alt={photo.caption ?? ""} loading="lazy" className="size-full object-cover" />
                )}
                {photo.kind === "video" && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid size-7 place-items-center rounded-full bg-black/55 text-white"><Play className="size-3.5 translate-x-px" fill="currentColor" aria-hidden /></span></span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <AlbumUploadDialog files={pending} onClose={() => setPending(null)} onConfirm={(items) => { setPending(null); void run(items); }} />
      <Link href="/album" className="calendar-open-link">Открыть альбом <ArrowUpRight size={14} /></Link>
      {open !== null && list.length > 0 && (
        <AlbumLightbox photos={list} thumbs={thumbs} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} onChanged={() => void reload()} nameOf={nameOf} />
      )}
    </section>
  );
}
