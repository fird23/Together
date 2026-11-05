import { DEFAULT_THEME, MODE_STORAGE_KEY, THEMES, THEME_STORAGE_KEY } from "@/lib/themes";

/**
 * Крошечный скрипт для <head>. Он выполняется ДО первой отрисовки страницы и сразу
 * ставит data-theme / data-mode на <html>. Без него при каждой загрузке тёмной темы
 * на долю секунды мигал бы светлый фон.
 */
const ids = THEMES.map((theme) => theme.id);
const backgrounds = Object.fromEntries(THEMES.map((theme) => [theme.id, theme.bg]));

export const themeInitScript = `(function(){try{
var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}),m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)}),
ids=${JSON.stringify(ids)},bg=${JSON.stringify(backgrounds)};
if(ids.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};
var dark=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var mode=dark?"dark":"light";
d.dataset.theme=t;d.dataset.mode=mode;
var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",bg[t][mode]);
}catch(e){}})();`;
