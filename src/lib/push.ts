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

export const webPermission = (): NotificationPermission | "unsupported" => (pushSupported() ? Notification.permission : "unsupported");

const DENIED = "Разрешение не выдано. Разрешите уведомления для сайта в настройках браузера (значок замка слева от адреса) и повторите.";

export async function subscribePush(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) throw new AppError("Уведомления в браузере не настроены: не задан ключ VAPID (см. NOTIFICATIONS_SETUP.md).");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new AppError(DENIED);
  let reg: ServiceWorkerRegistration;
  try {
    await navigator.serviceWorker.register("/sw.js");
    reg = await navigator.serviceWorker.ready;
  } catch {
    throw new AppError("Не удалось запустить фоновую службу уведомлений. Откройте сайт по защищённому адресу (https) и повторите.");
  }
  try {
    return await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as BufferSource });
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "NotAllowedError") throw new AppError(DENIED);
    if (name === "InvalidAccessError") throw new AppError("Ключ уведомлений на сайте задан неверно: проверьте NEXT_PUBLIC_VAPID_PUBLIC_KEY в Vercel и сделайте Redeploy.");
    if (name === "AbortError") throw new AppError("Браузер не смог подключиться к службе уведомлений. В Brave включите «Использовать службы Google для push-сообщений» (brave://settings/privacy). В остальных браузерах проверьте, что не отключены службы Google и расширения не блокируют уведомления.");
    throw new AppError("Не удалось подписаться на уведомления. Попробуйте ещё раз или откройте сайт в другом браузере.");
  }
}

const sameBytes = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

/**
 * Для уже включённых уведомлений: возвращает актуальную подписку, чтобы заново сохранить её в базе.
 * Если ключ VAPID на сайте сменился, подписка пересоздаётся (разрешение уже выдано, окно не появится).
 */
export async function refreshWebSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY || Notification.permission !== "granted") return null;
  const sub = await currentSubscription();
  if (!sub) return null;
  if (sameBytes(sub.options?.applicationServerKey, keyToBytes(VAPID_PUBLIC_KEY))) return sub;
  await sub.unsubscribe();
  return subscribePush();
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
