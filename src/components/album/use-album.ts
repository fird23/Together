"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { GENERIC_ERROR } from "@/lib/errors";
import { albumCount, albumUrls, listAlbum, uploadAlbumPhoto } from "@/services/album";
import type { AlbumPhoto } from "@/types";

export const MAX_ALBUM_FILES = 30;
const MAX_FILES = MAX_ALBUM_FILES;

/** Фото альбома (всё или последние `limit`), ссылки на миниатюры и общее число. Обновляется, когда партнёр добавляет фото. */
export function useAlbum(limit?: number) {
  const { couple } = useWorkspace();
  const [photos, setPhotos] = useState<AlbumPhoto[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const loadedAt = useRef(0);

  const load = useCallback(async () => {
    if (!couple) return;
    try {
      const list = await listAlbum(couple.id, limit);
      const [urls, count] = await Promise.all([albumUrls(list.map((p) => p.thumb_path)), limit ? albumCount(couple.id) : Promise.resolve(list.length)]);
      setPhotos(list); setThumbs(urls); setTotal(count); setError("");
      loadedAt.current = Date.now();
    } catch (e) {
      setPhotos((prev) => prev ?? []);
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
    }
  }, [couple, limit]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("album_photos", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  // Ссылки действуют час: при возвращении на вкладку обновляем их заранее.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - loadedAt.current > 30 * 60_000) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return { photos, thumbs, total, error, reload: load };
}

export type AlbumUploadItem = { file: File; takenOn: string };

/** Загрузка нескольких фото по очереди с прогрессом. Каждое фото ставится на свою дату. */
export function useAlbumUpload(onUploaded: () => void) {
  const { couple, profile } = useWorkspace();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async (items: AlbumUploadItem[]) => {
    if (!couple || !profile || items.length === 0) return;
    const images = items.filter((i) => i.file.type.startsWith("image/"));
    if (images.length === 0) { setError("Выберите фотографии: файлы других типов не подойдут."); return; }
    const batch = images.slice(0, MAX_FILES);
    setError("");
    let failed = 0;
    let firstError = "";
    for (let i = 0; i < batch.length; i++) {
      setProgress({ done: i, total: batch.length });
      try { await uploadAlbumPhoto(couple.id, profile.id, batch[i].file, batch[i].takenOn); }
      catch (e) { failed++; if (!firstError) firstError = e instanceof Error ? e.message : GENERIC_ERROR; }
    }
    setProgress(null);
    const notes: string[] = [];
    if (images.length > MAX_FILES) notes.push(`За один раз загружается до ${MAX_FILES} фото, остальные выберите ещё раз.`);
    if (images.length < items.length) notes.push("Файлы, которые не являются фотографиями, пропущены.");
    if (failed > 0) notes.push(`Не загрузилось: ${failed} из ${batch.length}. ${firstError}`);
    setError(notes.join(" "));
    onUploaded();
  }, [couple, profile, onUploaded]);

  return { run, progress, error, clearError: () => setError("") };
}
