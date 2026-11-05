"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { AVATAR_ACCEPT, AvatarError, prepareAvatar } from "@/lib/avatar";
import { GENERIC_ERROR } from "@/lib/errors";
import { removeAvatar, setAvatar } from "@/services/profile";

/** Смена и удаление фото профиля: выбор файла, предпросмотр, сохранение. */
export function AvatarPicker({ userId, path }: { userId: string; path: string | null }) {
  const { refresh } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  // Подготовленное фото и адрес для предпросмотра хранятся вместе: так адрес всегда освобождается.
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const draftRef = useRef<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  // При уходе со страницы освобождаем память, которую занимает предпросмотр.
  useEffect(() => () => {
    if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
  }, []);

  function replaceDraft(next: { blob: Blob; url: string } | null) {
    if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
    draftRef.current = next;
    setDraft(next);
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // чтобы можно было выбрать тот же файл ещё раз
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const blob = await prepareAvatar(file);
      replaceDraft({ blob, url: URL.createObjectURL(blob) });
      setSaveError(null);
    } catch (e) {
      setError(e instanceof AvatarError ? e.message : GENERIC_ERROR);
    } finally {
      setPreparing(false);
    }
  }

  function closePreview() {
    if (saving) return;
    replaceDraft(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await setAvatar(userId, draft.blob, path);
      await refresh();
      replaceDraft(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={AVATAR_ACCEPT} onChange={onFile} className="sr-only" tabIndex={-1} aria-label="Выбрать фото" />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={preparing}>
          <Camera className="size-4" aria-hidden /> {path ? "Изменить фото" : "Добавить фото"}
        </Button>
        {path && (
          <Button variant="ghost" size="sm" onClick={() => setRemoveOpen(true)}>
            <Trash2 className="size-4" aria-hidden /> Удалить
          </Button>
        )}
      </div>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}

      <Modal open={Boolean(draft)} onClose={closePreview} title="Новое фото" description="Так вас увидит партнёр. Фото обрезано по центру.">
        <div className="flex justify-center">
          {draft && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.url} alt="Предпросмотр нового фото" className="size-44 rounded-full object-cover ring-4 ring-accent-100" />
          )}
        </div>
        {saveError && (
          <Alert tone="error" className="mt-4">
            {saveError}
          </Alert>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={closePreview} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={save} loading={saving}>
            Сохранить фото
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={async () => {
          await removeAvatar(userId, path);
          await refresh();
        }}
        title="Удалить фото?"
        description="Вместо фото будет показана буква вашего имени."
        confirmLabel="Удалить фото"
      />
    </div>
  );
}
