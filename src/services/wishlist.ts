import { db } from "@/lib/supabase";

export type WishRow = { id: string; owner_id: string; title: string; details: string | null; link: string | null; media_path: string | null; created_at: string };
export type WishFields = { title: string; details: string | null; link: string | null; media_path: string | null };

/** Все желания пары. null — запрос не удался. */
export async function listWishes(coupleId: string): Promise<WishRow[] | null> {
  const { data, error } = await db()
    .from("wishlist_items")
    .select("id,owner_id,title,details,link,media_path,created_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });
  return error ? null : ((data ?? []) as WishRow[]);
}

/** Id желаний, которые человек отметил у себя. null — запрос не удался. */
export async function listMarkedIds(userId: string): Promise<string[] | null> {
  const { data, error } = await db().from("wishlist_private_marks").select("wishlist_item_id").eq("user_id", userId);
  return error ? null : (data ?? []).map((r) => r.wishlist_item_id as string);
}

/** Отметки партнёра на моих желаниях. Необязательные данные: при ошибке просто пусто. */
export async function listPartnerMarkedIds(partnerId: string): Promise<string[]> {
  const { data } = await db().from("wishlist_private_marks").select("wishlist_item_id").eq("user_id", partnerId);
  return (data ?? []).map((r) => r.wishlist_item_id as string);
}

/** Создаёт желание (existingId пусто) или меняет существующее. Бросает ошибку базы. */
export async function saveWish(coupleId: string, ownerId: string, existingId: string | null, fields: WishFields): Promise<void> {
  const { error } = existingId
    ? await db().from("wishlist_items").update(fields).eq("id", existingId)
    : await db().from("wishlist_items").insert({ couple_id: coupleId, owner_id: ownerId, ...fields });
  if (error) throw error;
}

export async function setWishMark(itemId: string, userId: string, marked: boolean): Promise<boolean> {
  const table = db().from("wishlist_private_marks");
  const { error } = marked
    ? await table.insert({ wishlist_item_id: itemId, user_id: userId })
    : await table.delete().eq("wishlist_item_id", itemId).eq("user_id", userId);
  return !error;
}

export async function deleteWish(id: string): Promise<boolean> {
  const { error } = await db().from("wishlist_items").delete().eq("id", id);
  return !error;
}
