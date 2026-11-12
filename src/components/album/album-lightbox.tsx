"use client";

import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { MediaViewer } from "@/components/ui/media-viewer";
import { GENERIC_ERROR } from "@/lib/errors";
import { albumUrls, deleteAlbumPhoto, updateAlbumPhoto } from "@/services/album";
import type { AlbumPhoto } from "@/types";

const longDate = (day: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${day}T12:00:00`));

/** Просмотр фото альбома на весь экран: листание, подпись, дата, скачивание и удаление. */
export function AlbumLightbox({
  photos, thumbs, index, onIndexChange, onClose, onChanged, nameOf,
}: {
  photos: AlbumPhoto[];
  thumbs: Record<string, string>;
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  onChanged: () => void;
  nameOf: (userId: string) => string;
}) {
  const i = Math.min(index, photos.length - 1);
  const photo = photos[i];
  const [full, setFull] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (photos.length === 0) onClose(); }, [photos.length, onClose]);

  // Ссылки на оригиналы подписываем для текущего и соседних снимков.
  useEffect(() => {
    const need = [i - 1, i, i + 1].map((k) => photos[k]?.media_path).filter((p): p is string => Boolean(p) && !full[p!]);
    if (need.length === 0) return;
    let alive = true;
    void albumUrls(need).then((urls) => { if (alive) setFull((prev) => ({ ...prev, ...urls })); });
    return () => { alive = false; };
  }, [i, photos, full]);

  if (!photo) return null;

  const viewerItems = photos.map((p) => ({ src: full[p.media_path] ?? thumbs[p.thumb_path] ?? "", alt: p.caption || `Фото от ${longDate(p.taken_on)}` }));

  const startEdit = () => { setCaption(photo.caption ?? ""); setDay(photo.taken_on); setError(""); setEditing(true); };

  async function save() {
    setBusy(true); setError("");
    try {
      await updateAlbumPhoto(photo.id, { caption: caption.trim() || null, ...(day && day !== photo.taken_on ? { taken_on: day } : {}) });
      setEditing(false); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm("Удалить это фото из общего альбома? Оно исчезнет у вас обоих.")) return;
    setBusy(true); setError("");
    try { await deleteAlbumPhoto(photo); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : GENERIC_ERROR); }
    setBusy(false);
  }

  async function download() {
    const url = full[photo.media_path];
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href; a.download = `together-${photo.taken_on}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch { setError("Не удалось скачать фото. Попробуйте ещё раз."); }
  }

  const field = "w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none ring-1 ring-white/20 focus:ring-white/60";

  return (
    <MediaViewer
      items={viewerItems}
      index={i}
      onIndexChange={(n) => { setEditing(false); setError(""); onIndexChange(n); }}
      onClose={onClose}
      toolbar={
        <>
          <button type="button" onClick={startEdit} disabled={busy} aria-label="Изменить подпись и дату" className="viewer-btn"><Pencil size={19} aria-hidden /></button>
          <button type="button" onClick={() => void download()} aria-label="Скачать фото" className="viewer-btn"><Download size={20} aria-hidden /></button>
          <button type="button" onClick={() => void remove()} disabled={busy} aria-label="Удалить фото" className="viewer-btn"><Trash2 size={20} aria-hidden /></button>
        </>
      }
      footer={
        <>
        {editing ? (
          <div className="mx-auto max-w-xl space-y-2">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} placeholder="Подпись к фото" aria-label="Подпись" className={field} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } e.stopPropagation(); }} />
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} max={new Date().toISOString().slice(0, 10)} aria-label="Дата" className={`${field} [color-scheme:dark]`}
              onKeyDown={(e) => e.stopPropagation()} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm text-white/80 hover:bg-white/10">Отмена</button>
              <button type="button" onClick={() => void save()} disabled={busy || !day} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">Сохранить</button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-xl text-center">
            {photo.caption && <p className="whitespace-pre-wrap text-[15px] leading-snug [overflow-wrap:anywhere]">{photo.caption}</p>}
            <p className="mt-1 text-xs text-white/65">{longDate(photo.taken_on)} · добавил(а): {nameOf(photo.uploaded_by)}</p>
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-center text-sm text-red-300">{error}</p>}
        </>
      }
    />
  );
}
