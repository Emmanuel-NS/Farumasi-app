import type { Medicine } from "@/types";
import type { SellMode } from "@/lib/packaging-classes";

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
