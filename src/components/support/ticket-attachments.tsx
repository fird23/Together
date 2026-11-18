"use client";

import { useEffect, useState } from "react";
import { MediaViewer } from "@/components/ui/media-viewer";
import { supportImageUrls } from "@/services/support";
import { PlainImage } from "@/components/ui/plain-image";

/** Фото из обращения: миниатюры и просмотр на весь экран. Нужен и автору, и администратору. */
export function TicketAttachments({ paths }: { paths: string[] | null | undefined }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const list = paths ?? [];
  const key = list.join("|");

  useEffect(() => {
    if (list.length === 0) return;
    let alive = true;
    void supportImageUrls(list).then((map) => { if (alive) setUrls(map); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (list.length === 0) return null;
  const items = list.map((p, i) => ({ src: urls[p] ?? "", alt: `Вложение ${i + 1}` }));

  return (
    <>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {list.map((p, i) => (
          <li key={p}>
            <button type="button" onClick={() => urls[p] && setOpen(i)} aria-label={`Открыть вложение ${i + 1} на весь экран`} className="block size-16 overflow-hidden rounded-xl bg-sand-100 ring-1 ring-sand-200 transition hover:ring-accent-600">
              {urls[p] && <PlainImage src={urls[p]} alt="" loading="lazy" className="size-full object-cover" />}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && items.every((x) => x.src) && <MediaViewer items={items} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
