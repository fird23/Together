"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Check, Repeat, Trash2, Type } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { GENERIC_ERROR } from "@/lib/errors";
import { EVENT_COLORS, REPEAT_LABELS } from "@/utils/calendar";
import { daysTogether } from "@/utils/days";
import type { EventColor, EventRepeat } from "@/types";
import type { EventInput } from "@/services/calendar";

export type EventDraft = { id?: string; title: string; note: string; color: EventColor; start: string; end: string; repeat: EventRepeat };

const dayCount = (a: string, b: string) => daysTogether(a, new Date(`${b}T12:00:00`)) + 1;

/** Диалог создания и изменения пометки. Форма монтируется заново при каждом открытии. */
export function CalendarEventModal({
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  draft: EventDraft | null;
  onClose: () => void;
  onSave: (input: EventInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const editing = Boolean(draft?.id);
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={editing ? "Изменить пометку" : "Новая пометка"}
      description="Пометку увидите вы оба. Её можно поставить на один день или на несколько подряд."
    >
      {draft && <EventForm draft={draft} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
    </Modal>
  );
}

function EventForm({
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  draft: EventDraft;
  onClose: () => void;
  onSave: (input: EventInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(draft.title);
  const [note, setNote] = useState(draft.note);
  const [color, setColor] = useState<EventColor>(draft.color);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [repeat, setRepeat] = useState<EventRepeat>(draft.repeat);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Напишите название пометки.");
    if (!start || !end) return setError("Укажите даты.");
    if (end < start) return setError("Дата окончания раньше даты начала.");
    setPending(true); setError("");
    try {
      await onSave({ title, note, color, start, end, repeat }, draft.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
      setPending(false);
    }
  }

  async function remove() {
    if (!draft.id || !window.confirm(`Удалить пометку «${draft.title}»?`)) return;
    setPending(true); setError("");
    try {
      await onDelete(draft.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Название" icon={Type} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Например, поездка на море" autoFocus disabled={pending} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="С" type="date" icon={CalendarDays} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} disabled={pending} />
        <TextField label="По" type="date" icon={CalendarDays} value={end} min={start} onChange={(e) => setEnd(e.target.value)} disabled={pending} />
      </div>
      {start && end && end >= start && <p className="-mt-2 text-sm text-ink-soft">{dayCount(start, end) === 1 ? "Один день" : `Дней подряд: ${dayCount(start, end)}`}</p>}

      <div>
        <label htmlFor="event-repeat" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Repeat className="size-4 text-ink-faint" aria-hidden /> Повтор</label>
        <select id="event-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as EventRepeat)} disabled={pending} className="h-11 w-full rounded-control border border-sand-300 bg-paper px-3 text-ink">
          {(Object.keys(REPEAT_LABELS) as EventRepeat[]).map((key) => <option key={key} value={key}>{REPEAT_LABELS[key]}</option>)}
        </select>
        {draft.id && draft.repeat !== "none" && <p className="mt-1.5 text-xs text-ink-faint">Это повторяющаяся пометка: изменения применятся ко всем повторам.</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Цвет</legend>
        <div className="flex flex-wrap gap-2.5">
          {EVENT_COLORS.map((c) => (
            <label key={c.id} className="relative cursor-pointer" title={c.label}>
              <input type="radio" name="color" value={c.id} checked={color === c.id} onChange={() => setColor(c.id)} className="peer sr-only" />
              <span className="grid size-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-paper transition peer-checked:ring-2 peer-focus-visible:ring-2" style={{ background: c.hex, ["--tw-ring-color" as string]: c.hex }}>
                {color === c.id && <Check className="size-4" aria-hidden />}
              </span>
              <span className="sr-only">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="event-note" className="mb-1.5 block text-sm font-medium">Заметка <span className="font-normal text-ink-faint">(необязательно)</span></label>
        <textarea id="event-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} rows={3} disabled={pending} className="cal-textarea" placeholder="Детали, адрес, что взять с собой…" />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {draft.id ? (
          <Button variant="danger" onClick={remove} disabled={pending}><Trash2 className="size-4" aria-hidden /> Удалить</Button>
        ) : <span />}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" onClick={onClose} disabled={pending}>Отмена</Button>
          <Button type="submit" loading={pending}>Сохранить</Button>
        </div>
      </div>
    </form>
  );
}
