"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { readPhotoDate } from "@/lib/exif";
import type { AlbumUploadItem } from "@/components/album/use-album";

const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayStr = () => localDay(Date.now());

type Row = { file: File; idx: number; date: string; edited: boolean };

/** Перед загрузкой: к какому дню привязать каждое фото. Дата подставляется из снимка, её можно поменять. */
export function AlbumUploadDialog({ files, onClose, onConfirm }: { files: File[] | null; onClose: () => void; onConfirm: (items: AlbumUploadItem[]) => void }) {
  return (
    <Modal open={files !== null} onClose={onClose} title="Добавить в альбом" description="Укажите, когда сделаны фото: в альбоме они встанут по этим датам.">
      {files && <UploadForm key={files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|")} files={files} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  );
}

function UploadForm({ files, onClose, onConfirm }: { files: File[]; onClose: () => void; onConfirm: (items: AlbumUploadItem[]) => void }) {
  const [rows, setRows] = useState<Row[]>(() => files.map((file, idx) => ({ file, idx, date: file.lastModified ? localDay(file.lastModified) : todayStr(), edited: false })));
  const [previews, setPreviews] = useState<string[]>([]);
  const [all, setAll] = useState("");
  const max = todayStr();

  // Дата съёмки из самого снимка точнее даты файла: подставляем её, если вы ещё не меняли дату вручную.
  useEffect(() => {
    let alive = true;
    void Promise.all(files.map((f) => readPhotoDate(f))).then((dates) => {
      if (!alive) return;
      setRows((prev) => prev.map((r, i) => (dates[i] && !r.edited ? { ...r, date: dates[i]! > max ? max : dates[i]! } : r)));
    });
    return () => { alive = false; };
  }, [files, max]);

  // Адреса превью живут, пока открыт диалог (и пересоздаются, если эффект перезапустится).
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const setDate = (i: number, date: string) => setRows((prev) => prev.map((r, k) => (k === i ? { ...r, date, edited: true } : r)));
  const remove = (i: number) => setRows((prev) => prev.filter((_, k) => k !== i));
  const applyAll = () => { if (all) setRows((prev) => prev.map((r) => ({ ...r, date: all, edited: true }))); };
  const valid = rows.length > 0 && rows.every((r) => r.date && r.date <= max);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sand-100 p-3">
        <label htmlFor="album-all-date" className="mb-1.5 block text-sm font-medium">Одна дата для всех фото</label>
        <div className="flex gap-2">
          <input id="album-all-date" type="date" value={all} max={max} onChange={(e) => setAll(e.target.value)} className="hb-input min-w-0 flex-1" />
          <Button type="button" variant="secondary" size="sm" onClick={applyAll} disabled={!all}>Применить</Button>
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">Или укажите дату у каждого фото ниже. Сначала подставляется дата съёмки из снимка, если она в нём есть.</p>
      </div>

      <ul className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <li key={r.idx} className="flex items-center gap-3 rounded-xl bg-paper p-2 ring-1 ring-sand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previews[r.idx]} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink-faint">{r.file.name}</p>
              <input type="date" value={r.date} max={max} onChange={(e) => setDate(i, e.target.value)} aria-label={`Дата фото ${r.file.name}`} className="hb-input mt-1 w-full" />
            </div>
            <button type="button" onClick={() => remove(i)} aria-label="Убрать фото из списка" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-sand-100 hover:text-danger"><X className="size-4" aria-hidden /></button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button onClick={() => { onConfirm(rows.map((r) => ({ file: r.file, takenOn: r.date }))); }} disabled={!valid}>Добавить: {rows.length}</Button>
      </div>
    </div>
  );
}
