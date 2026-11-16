"use client";

import { useEffect } from "react";
import { BUILD_ID, platformName } from "@/lib/app-info";
import { supabase } from "@/lib/supabase";

const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /AbortError/i, /Failed to fetch/i, /Load failed/i, /NetworkError/i, /cancell?ed/i];
const MAX_PER_SESSION = 5;

/**
 * Отправляет необработанные ошибки приложения в журнал админ-панели: текст, место в коде и страница (без адресных параметров и без личных данных).
 * Однотипные ошибки за сеанс отправляются один раз, всего не больше пяти. Ничего не рисует.
 */
export function ErrorReporter() {
  useEffect(() => {
    const seen = new Set<string>();
    const report = (message: string, stack?: string) => {
      const text = (message || "").trim();
      if (!supabase || !text || seen.size >= MAX_PER_SESSION || seen.has(text) || IGNORE.some((re) => re.test(text))) return;
      seen.add(text);
      void supabase.rpc("report_client_error", { p_message: text, p_stack: stack ?? null, p_path: window.location.pathname, p_platform: platformName(), p_build: BUILD_ID }).then(() => {}, () => {});
    };
    const onError = (e: ErrorEvent) => report(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r instanceof Error ? r.message : typeof r === "string" ? r : "Необработанная ошибка в промисе", r instanceof Error ? r.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
