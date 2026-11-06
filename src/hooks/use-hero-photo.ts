"use client";

import { useEffect, useState } from "react";
import { heroPhotoUrl } from "@/services/hero-photo";

/** Ссылка на общее фото пары. Обновляется до истечения срока действия. */
export function useHeroPhotoUrl(path: string | null | undefined) {
  const [state, setState] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    const fetchUrl = () => heroPhotoUrl(path).then((url) => { if (!cancelled && url) setState({ path, url }); }).catch(() => {});
    void fetchUrl();
    const timer = setInterval(fetchUrl, 50 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [path]);

  return path && state?.path === path ? state.url : null;
}
