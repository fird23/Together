/**
 * Видео для альбома: лимит размера, обложка (кадр) и длительность, а для больших роликов сжатие в браузере.
 */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const POSTER_SIDE = 520;

export class VideoError extends Error {
  constructor(message: string) { super(message); this.name = "VideoError"; }
}

export const isVideo = (file: File) => file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|3gp)$/i.test(file.name);

export const fmtMB = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString("ru-RU", { maximumFractionDigits: bytes < 10 * 1024 * 1024 ? 1 : 0 })} МБ`;

/** Сжать видео в браузере можно там, где есть запись потока из элемента video (Chrome, Edge, Firefox, Android). В Safari на iPhone этого нет. */
export function canCompressVideo(): boolean {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return false;
  return typeof (HTMLVideoElement.prototype as unknown as { captureStream?: unknown }).captureStream === "function" && pickRecorderType() !== null;
}

function pickRecorderType(): string | null {
  for (const type of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function openVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const timer = window.setTimeout(() => reject(new VideoError("Не удалось прочитать видео.")), 12_000);
    video.onloadedmetadata = () => { window.clearTimeout(timer); resolve(video); };
    video.onerror = () => { window.clearTimeout(timer); reject(new VideoError("Не удалось открыть это видео: формат не поддерживается браузером.")); };
    video.src = src;
  });
}

/** Длительность в секундах и обложка (кадр около первой секунды). Если кадр достать не удалось, обложки не будет. */
export async function readVideoMeta(file: File): Promise<{ duration: number; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  try {
    const video = await openVideo(url);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    let poster: Blob | null = null;
    try {
      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error("seek")), 8000);
        video.onseeked = () => { window.clearTimeout(t); resolve(); };
        video.currentTime = Math.min(1, Math.max(0.05, duration / 10));
      });
      const scale = Math.min(1, POSTER_SIDE / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
    } catch { /* без обложки: покажем значок видео */ }
    return { duration, poster };
  } finally { URL.revokeObjectURL(url); }
}

/**
 * Пережимает видео в WebM с меньшим битрейтом (запись воспроизведения в реальном времени: ролик в минуту сжимается минуту).
 * Нужно, когда файл больше лимита или вы включили экономию места.
 */
export async function compressVideo(file: File, onProgress?: (fraction: number) => void): Promise<Blob> {
  if (!canCompressVideo()) throw new VideoError(`Видео больше ${fmtMB(MAX_VIDEO_BYTES)}, а сжать его в этом браузере нельзя. Обрежьте ролик или выберите покороче.`);
  const url = URL.createObjectURL(file);
  try {
    const video = await openVideo(url);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Битрейт подбираем так, чтобы ролик заведомо уместился в лимит.
    const budgetBits = MAX_VIDEO_BYTES * 8 * 0.82;
    const bitrate = Math.max(350_000, Math.min(2_500_000, duration > 0 ? Math.floor(budgetBits / duration) - 96_000 : 1_500_000));
    video.muted = false;
    video.volume = 0; // звук пишем в файл, но в динамики не выводим
    const stream = (video as unknown as { captureStream: () => MediaStream }).captureStream();
    const type = pickRecorderType()!;
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitrate, audioBitsPerSecond: 96_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = () => reject(new VideoError("Не удалось сжать видео."));
    });
    const tick = window.setInterval(() => { if (duration > 0) onProgress?.(Math.min(0.99, video.currentTime / duration)); }, 400);
    video.onended = () => { if (recorder.state !== "inactive") recorder.stop(); };
    recorder.start(1000);
    await video.play().catch(() => { throw new VideoError("Браузер не дал воспроизвести видео для сжатия. Нажмите на страницу и повторите."); });
    const blob = await done.finally(() => window.clearInterval(tick));
    onProgress?.(1);
    if (blob.size > MAX_VIDEO_BYTES) throw new VideoError(`Даже после сжатия видео больше ${fmtMB(MAX_VIDEO_BYTES)}. Выберите ролик покороче.`);
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
