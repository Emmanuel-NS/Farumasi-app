import type { Medicine } from "@/types";
import type { SellMode } from "@/lib/packaging-classes";

/** Minimal listing fields needed for catalogue price ranges. */
export type ListingPriceMap = Map<
  string,
  Map<string, { price: number; unitPrice?: number | null }>
>;

/**
 * Returns the correct unit price for one cart line.
 *
 * Strict sell-mode isolation:
 *  - "partial" lines → per-unit price ONLY (listing.unitPrice or medicine.unitPriceFrom).
 *    Returns 0 when no partial price is available so it is never confused with a pack price.
 *  - "pack" lines → pack/container price ONLY.
 */
export function cartLineUnitPrice(
  medicine: Medicine,
  sellMode: SellMode,
  listing?: { price: number; unitPrice?: number | null },
): number {
  if (sellMode === "partial") {
    if (listing && listing.unitPrice != null && listing.unitPrice > 0) return listing.unitPrice;
    // Catalogue-level estimate — never fall back to pack price
    return medicine.unitPriceFrom ?? 0;
  }
  // Pack / container
  if (listing) return listing.price;
  return medicine.price;
}

export function minQuantityForLine(medicine: Medicine, sellMode: SellMode): number {
  if (sellMode === "partial") {
    return Math.max(1, medicine.minPartialQuantity ?? 1);
  }
  return 1;
}

/** Per-unit min/max from active listings, or catalogue fallback for pack/partial. */
export function lineUnitPriceRange(
  medicine: Medicine,
  sellMode: SellMode,
  listingsMap: ListingPriceMap,
): { min: number; max: number } | null {
  if (sellMode === "partial") {
    const unitPrices: number[] = [];
    for (const byProduct of listingsMap.values()) {
      const entry = byProduct.get(medicine.id);
      if (entry?.unitPrice != null && entry.unitPrice > 0) {
        unitPrices.push(entry.unitPrice);
      }
    }
    if (unitPrices.length > 0) {
      return { min: Math.min(...unitPrices), max: Math.max(...unitPrices) };
    }
    if (medicine.unitPriceFrom != null && medicine.unitPriceFrom > 0) {
      return { min: medicine.unitPriceFrom, max: medicine.unitPriceFrom };
    }
    return null;
  }

  const packPrices: number[] = [];
  for (const byProduct of listingsMap.values()) {
    const entry = byProduct.get(medicine.id);
    if (entry?.price != null && entry.price > 0) packPrices.push(entry.price);
  }
  if (packPrices.length > 0) {
    return { min: Math.min(...packPrices), max: Math.max(...packPrices) };
  }
  const min = medicine.price;
  const max = medicine.maxPrice ?? medicine.price;
  if (min <= 0 && max <= 0) return null;
  return { min, max: Math.max(min, max) };
}

export function lineTotalPriceRange(
  medicine: Medicine,
  sellMode: SellMode,
  qty: number,
  listingsMap: ListingPriceMap,
): { min: number; max: number } | null {
  const unit = lineUnitPriceRange(medicine, sellMode, listingsMap);
  if (!unit) return null;
  return { min: unit.min * qty, max: unit.max * qty };
}
