"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AlbumLightbox } from "@/components/album/album-lightbox";
import { useAlbum, useAlbumUpload } from "@/components/album/use-album";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { featureOn } from "@/utils/features";
import { cn } from "@/utils/cn";
import type { AlbumPhoto } from "@/types";

const monthLabel = (key: string) => {
  const text = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${key}-15T12:00:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function AlbumView() {
  const { couple, profile, partner } = useWorkspace();
  const { photos, thumbs, error, reload } = useAlbum();
  const { run, progress, error: uploadError } = useAlbumUpload(() => void reload());
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  if (!couple || !profile) return null;
  if (!featureOn(couple, "album")) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-paper p-8 text-center shadow-soft ring-1 ring-sand-200">
        <p className="font-semibold">Фотоальбом отключён</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">Блок выключен в настройках пары. Фотографии сохранены: включите его обратно, когда захотите.</p>
        <Link href="/settings#features" className="mt-4 inline-block text-sm font-semibold text-accent-700 underline underline-offset-4">Открыть настройки</Link>
      </div>
    );
  }

  const nameOf = (id: string) => (id === profile.id ? "вы" : partner?.display_name ?? "партнёр");
  const list = photos ?? [];
  const groups: { key: string; items: { photo: AlbumPhoto; index: number }[] }[] = [];
  list.forEach((photo, index) => {
    const key = photo.taken_on.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push({ photo, index });
    else groups.push({ key, items: [{ photo, index }] });
  });
  const uploading = progress !== null;
  const pick = (files: FileList | null) => { if (files && files.length) void run(Array.from(files)); if (input.current) input.current.value = ""; };

  return (
    <div
      className="mx-auto max-w-6xl"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
    >
      <PageHeader
        title="Фотоальбом"
        description={list.length > 0 ? `Общих фотографий: ${list.length}. Нажмите на фото, чтобы открыть его на весь экран.` : "Общие фотографии пары: видны только вам двоим."}
        actions={
          <>
            <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files)} />
            <Button onClick={() => input.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              {uploading ? `Загружаем ${Math.min(progress.done + 1, progress.total)} из ${progress.total}…` : "Добавить фото"}
            </Button>
          </>
        }
      />

      {uploadError && <Alert tone="error" className="mb-4">{uploadError}</Alert>}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className={cn("rounded-card transition", dragging && "bg-accent-50 ring-2 ring-dashed ring-accent-600")}>
        {photos === null ? (
          <p className="text-sm text-ink-soft">Загружаем…</p>
        ) : list.length === 0 ? (
          <div className="rounded-card border border-dashed border-sand-300 bg-paper px-5 py-12">
            <EmptyState
              icon={ImagePlus}
              title="Здесь будут ваши фото"
              description="Добавьте первые фотографии: с телефона или перетащите их сюда с компьютера. Дата берётся из файла, её можно поменять."
              action={<Button onClick={() => input.current?.click()} disabled={uploading}><ImagePlus className="size-4" aria-hidden /> Добавить фото</Button>}
            />
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="mb-8" aria-label={monthLabel(group.key)}>
              <h2 className="mb-3 font-serif text-xl font-semibold">{monthLabel(group.key)}</h2>
              <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
                {group.items.map(({ photo, index }) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(index)}
                      aria-label={photo.caption ? `Открыть фото: ${photo.caption}` : "Открыть фото на весь экран"}
                      className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-sand-100 ring-1 ring-sand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
                    >
                      {thumbs[photo.thumb_path] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={thumbs[photo.thumb_path]} alt={photo.caption ?? ""} loading="lazy" className="size-full object-cover transition duration-200 group-hover:scale-[1.04]" />
                      )}
                      {photo.caption && <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] font-medium text-white">{photo.caption}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {open !== null && list.length > 0 && (
        <AlbumLightbox photos={list} thumbs={thumbs} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} onChanged={() => void reload()} nameOf={nameOf} />
      )}
    </div>
  );
}
