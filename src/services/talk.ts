import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import { removeTalkImages } from "@/services/talk-media";
import type { TalkKind, TalkReply, TalkThread } from "@/types";

export async function listTalk(coupleId: string): Promise<{ threads: TalkThread[]; replies: TalkReply[] }> {
  const [t, r] = await Promise.all([
    db().from("talk_threads").select("id,couple_id,author_id,kind,body,resolved,created_at,media_path").eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(100),
    db().from("talk_replies").select("id,thread_id,author_id,body,created_at,media_path").eq("couple_id", coupleId).order("created_at").limit(1000),
  ]);
  if (t.error || r.error) throw new AppError("Разговоры не готовы: примените миграцию 014_todos_talk_gratitude.sql.");
  return { threads: (t.data ?? []) as TalkThread[], replies: (r.data ?? []) as TalkReply[] };
}

export async function startThread(coupleId: string, userId: string, kind: TalkKind, body: string, mediaPath: string | null = null) {
  const { error } = await db().from("talk_threads").insert({ couple_id: coupleId, author_id: userId, kind, body: body.trim(), media_path: mediaPath });
  if (error) throw dbError(error);
}

export async function reply(coupleId: string, threadId: string, userId: string, body: string, mediaPath: string | null = null) {
  const { error } = await db().from("talk_replies").insert({ couple_id: coupleId, thread_id: threadId, author_id: userId, body: body.trim(), media_path: mediaPath });
  if (error) throw dbError(error);
}

export async function setResolved(threadId: string, resolved: boolean) {
  const { error } = await db().from("talk_threads").update({ resolved }).eq("id", threadId);
  if (error) throw dbError(error);
}

export async function deleteThread(threadId: string, mediaPaths: string[] = []) {
  const { error } = await db().from("talk_threads").delete().eq("id", threadId);
  if (error) throw dbError(error);
  await removeTalkImages(mediaPaths).catch(() => {}); // файлы удаляются вместе с обращением
}
