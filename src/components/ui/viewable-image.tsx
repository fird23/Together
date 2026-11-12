"use client";

import { useState } from "react";
import { MediaViewer } from "@/components/ui/media-viewer";

/** Фото, которое по нажатию открывается на весь экран (вместо новой вкладки). */
export function ViewableImage({ src, alt, className, imgClassName }: { src: string; alt: string; className?: string; imgClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Открыть на весь экран: ${alt}`} className={className} style={{ cursor: "zoom-in" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className={imgClassName} />
      </button>
      {open && <MediaViewer items={[{ src, alt }]} index={0} onClose={() => setOpen(false)} />}
    </>
  );
}
