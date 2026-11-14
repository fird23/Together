"use client";

import { useEffect } from "react";

const FIELD = "input, textarea, select, [contenteditable='true']";
const NOT_TEXT = "input[type='checkbox'], input[type='radio'], input[type='range'], input[type='file'], input[type='button'], input[type='submit'], input[type='color']";

const isTextField = (el: Element | null): el is HTMLElement => Boolean(el && el.matches(FIELD) && !el.matches(NOT_TEXT));

/**
 * Чтобы поле ввода не пряталось под экранной клавиатурой:
 *  • прокручивает страницу к полю, когда оно получает фокус и когда клавиатура открылась;
 *  • выставляет на <html> признак data-kb="open" (нижняя панель прячется), высоту видимой области --vvh
 *    и запас --kb-inset, чтобы последнее поле можно было прокрутить выше клавиатуры;
 *  • сдвиг видимой области --vv-top нужен диалогам на iPhone.
 * Ничего не рисует.
 */
export function KeyboardAware() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let baseline = window.innerHeight;
    let focusedAt = 0;

    const update = () => {
      const focused = isTextField(document.activeElement);
      const height = vv?.height ?? window.innerHeight;
      if (!focused) baseline = Math.max(window.innerHeight, height);
      const shrink = baseline - height;
      const open = focused && shrink > 120;
      const layoutShrank = baseline - window.innerHeight > 120; // браузер сам уменьшил страницу: запас не нужен
      if (open) root.dataset.kb = "open"; else delete root.dataset.kb;
      root.style.setProperty("--vvh", `${Math.round(height)}px`);
      root.style.setProperty("--vv-top", `${Math.round(vv?.offsetTop ?? 0)}px`);
      root.style.setProperty("--kb-inset", open && !layoutShrank ? `${Math.round(Math.max(0, shrink - (vv?.offsetTop ?? 0)))}px` : "0px");
    };

    const reveal = () => {
      const el = document.activeElement;
      if (isTextField(el)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextField(e.target as Element)) return;
      focusedAt = Date.now();
      update();
      window.setTimeout(reveal, 320); // клавиатура выезжает не мгновенно
    };
    const onFocusOut = () => window.setTimeout(update, 60);
    const onViewport = () => {
      update();
      if (Date.now() - focusedAt < 1500) reveal(); // клавиатура только что открылась
    };

    update();
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", onViewport);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", onViewport);
      delete root.dataset.kb;
    };
  }, []);

  return null;
}
