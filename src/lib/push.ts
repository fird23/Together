import { AppError } from "@/lib/errors";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone и iPad показывают push только у сайта, добавленного на экран «Домой». */
export function needsInstallOnIos() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function subscribePush(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) throw new AppError("Уведомления ещё не настроены на сервере.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new AppError("Разрешение не выдано. Включите уведомления для сайта в настройках браузера.");
  await navigator.serviceWorker.register("/sw.js");
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as BufferSource });
}

/** Отписывает это устройство и возвращает адрес подписки, чтобы удалить её из базы. */
export async function unsubscribePush(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export async function showLocalTest() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("Together", { body: "Так будут выглядеть уведомления 💜", icon: "/icons/icon-192.png", badge: "/icons/badge.png" });
}
