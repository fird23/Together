import type { Couple, CoupleFeatures } from "@/types";

/** Календарь и настроение отключить нельзя, поэтому в списке только необязательные блоки. */
export type FeatureKey = keyof CoupleFeatures;

export function featureOn(couple: Couple | null | undefined, key: FeatureKey): boolean {
  return couple?.features?.[key] !== false;
}
