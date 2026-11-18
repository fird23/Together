// Edge Function: sends every new support ticket to your Telegram.
// Triggered by a Database Webhook on INSERT into public.support_tickets (see SUPPORT_SETUP.md).
const KINDS: Record<string, string> = { idea: "💡 Предложение", bug: "🐞 Ошибка", question: "❓ Вопрос", other: "💬 Другое" };

/** Сравнение секрета за постоянное время: по времени ответа нельзя угадать секрет по символам. */
function secretMatches(received: string | null): boolean {
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (!expected || received === null) return false;
  const a = new TextEncoder().encode(received), b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (!secretMatches(req.headers.get("x-webhook-secret"))) {
    return new Response("forbidden", { status: 403 });
  }
  const { record } = await req.json();
  const text = [
    KINDS[record.kind] ?? record.kind,
    `От: ${record.display_name ?? "—"} (${record.email ?? "—"})`,
    "",
    record.message,
    record.meta?.page ? `\nСтраница: ${record.meta.page}` : "",
    Array.isArray(record.attachments) && record.attachments.length ? `📎 Фото: ${record.attachments.length} (смотрите в админ-панели)` : "",
  ].join("\n").slice(0, 4000);

  const res = await fetch(`https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: Deno.env.get("TELEGRAM_CHAT_ID"), text }),
  });
  return new Response(res.ok ? "ok" : "telegram error", { status: res.ok ? 200 : 502 });
});
