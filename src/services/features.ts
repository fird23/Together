import { db } from "@/lib/supabase";
import { AppError, dbError } from "@/lib/errors";
import type { CoupleFeatures } from "@/types";

/** Включает или отключает блоки у обоих партнёров. Данные не удаляются. */
export async function updateFeatures(coupleId: string, features: CoupleFeatures) {
  const { data, error } = await db()
    .from("couples")
    .update({ features, updated_at: new Date().toISOString() })
    .eq("id", coupleId)
    .select("id");
  if (error) throw new AppError("Не удалось сохранить. Примените миграцию 013_features_and_push.sql.");
  if (!data?.length) throw dbError({ message: "Не удалось сохранить настройку." });
}
