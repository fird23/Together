"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Диалог на нативном <dialog>: фокус, Esc и затемнение работают без лишнего кода. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="modal m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-paper p-0 text-ink shadow-lift backdrop:bg-ink/35"
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-serif text-xl font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="-mr-2 -mt-2 grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-sand-100 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
