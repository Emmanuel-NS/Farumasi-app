import type { Pharmacy } from "@/types";
import type { CartEntry } from "@/store/cart-store";
import type { MedicineAvailability, PharmacyOption } from "@/components/cart/pharmacy-match-details";
import {
  calcInsuranceSaving,
  pharmacyAcceptsRxInsurance,
  priceAfterInsurance,
} from "@/lib/rx-insurance";

export type ListingEntry = {
  listingId: string;
  price: number;
  unitPrice: number | null;
  status: string;
  fulfillmentMin: number;
  expiryDate: string | null;
};
export type ListingsMap = Map<string, Map<string, ListingEntry>>;

const KIGALI = new Set(["Gasabo", "Nyarugenge", "Kicukiro"]);

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function roadDistanceKm(straightLineKm: number): number {
  return straightLineKm * 1.3;
}

/**
 * Priority tiers (weights sum to 100):
 * 1. Stock availability + open now (50)
 * 2. Prescription insurance if pharmacist applied it (20)
 * 3. Distance + price — equal weight (15 + 15). Price only among pharmacies with ALL items.
 */
export function scorePharmacies(
  cartLines: CartEntry[],
  pharmacies: Pharmacy[],
  listingsMap: ListingsMap,
  patientDistrict = "",
  patientLocation: [number, number] | null = null,
  rxInsuranceProvider: string | null = null,
  rxInsuranceDiscountPct: number | null = null,
): PharmacyOption[] {
  if (pharmacies.length === 0 || cartLines.length === 0) return [];

  const raw = pharmacies
    .map((pharmacy) => {
      const byProduct = listingsMap.get(pharmacy.id) ?? new Map<string, ListingEntry>();
      const availability: MedicineAvailability[] = cartLines.map(({ medicine: med, sellMode, qty }) => {
        const entry = byProduct.get(med.id);
        if (!entry) {
          return { medicineName: med.name, available: false, stockStatus: "unavailable", unitPrice: 0 };
        }
        if (sellMode === "partial" && (entry.unitPrice == null || entry.unitPrice <= 0)) {
          return { medicineName: med.name, available: false, stockStatus: "no_partial_price", unitPrice: 0 };
        }
        const linePrice =
          sellMode === "partial" ? entry.unitPrice! * qty : entry.price * qty;
        return {
          medicineName: med.name,
          available: entry.status === "available" || entry.status === "low_stock",
          stockStatus: entry.status,
          unitPrice: linePrice,
        };
      });

      const availableCount = availability.filter((a) => a.available).length;
      const priceEstimate = availability.reduce((s, a) => s + a.unitPrice, 0);
      const now = Date.now();
      const expiryDays = [...byProduct.values()]
        .filter((e) => e.expiryDate)
        .map((e) => Math.floor((new Date(e.expiryDate!).getTime() - now) / 86_400_000));
      const minExpiryDays = expiryDays.length > 0 ? Math.min(...expiryDays) : Infinity;

      const distanceKm = patientLocation
        ? haversineKm(
            patientLocation[0],
            patientLocation[1],
            pharmacy.coordinates[0],
            pharmacy.coordinates[1],
          )
        : 0;
      const roadKm = distanceKm > 0 ? roadDistanceKm(distanceKm) : 0;

      return {
        pharmacy,
        availability,
        availableCount,
        totalCount: cartLines.length,
        priceEstimate,
        minExpiryDays,
        distanceKm,
        roadKm,
      };
    })
    .filter((r) => r.availableCount > 0);

  if (raw.length === 0) return [];

  const totalCandidates = raw.length;
  const fullStock = raw.filter((r) => r.availableCount === r.totalCount);

  const priceRankById = new Map(
    [...raw]
      .sort((a, b) => a.priceEstimate - b.priceEstimate)
      .map((r, i) => [r.pharmacy.id, i + 1] as const),
  );

  const fullStockPriceRankById = new Map(
    [...fullStock]
      .sort((a, b) => a.priceEstimate - b.priceEstimate)
      .map((r, i) => [r.pharmacy.id, i + 1] as const),
  );

  const distanceRankById = new Map(
    [...raw]
      .filter((r) => r.distanceKm > 0)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((r, i) => [r.pharmacy.id, i + 1] as const),
  );

  const fullPrices = fullStock.map((r) => r.priceEstimate);
  const minFullPrice = fullPrices.length ? Math.min(...fullPrices) : 0;
  const maxFullPrice = fullPrices.length ? Math.max(...fullPrices) : 0;
  const fullPriceRange = maxFullPrice - minFullPrice || 1;

  const distWithKm = raw.filter((r) => r.distanceKm > 0);
  const minDist = distWithKm.length ? Math.min(...distWithKm.map((r) => r.distanceKm)) : 0;
  const maxDist = distWithKm.length ? Math.max(...distWithKm.map((r) => r.distanceKm)) : 0;
  const distRange = maxDist - minDist || 1;

  const rxHasInsurance = Boolean(rxInsuranceProvider && rxInsuranceDiscountPct);
  const discountPct = rxInsuranceDiscountPct ?? 0;
  const W = {
    availability: 35,
    open: 15,
    insurance: rxHasInsurance ? 20 : 0,
    proximity: 15,
    price: 15,
  };
  const maxScore = W.availability + W.open + W.insurance + W.proximity + W.price;

  const scored = raw.map((r) => {
    const isFull = r.availableCount === r.totalCount;
    const availRatio = r.availableCount / r.totalCount;
    const availScore = availRatio * W.availability * (isFull ? 1 : 0.75);
    const openScore = r.pharmacy.isOpen ? W.open : 0;
    const insuranceMatch =
      rxHasInsurance &&
      pharmacyAcceptsRxInsurance(r.pharmacy.supportedInsurances, rxInsuranceProvider);
    const insScore = insuranceMatch ? W.insurance : 0;
    const insuranceSaving = insuranceMatch
      ? calcInsuranceSaving(r.priceEstimate, discountPct)
      : 0;
    const priceAfterIns = insuranceMatch
      ? priceAfterInsurance(r.priceEstimate, discountPct)
      : r.priceEstimate;

    let proximityScore = 0;
    if (patientLocation && r.distanceKm > 0) {
      proximityScore = (1 - (r.distanceKm - minDist) / distRange) * W.proximity;
    } else if (patientDistrict) {
      const pharmDistrict = r.pharmacy.district;
      const proxFactor =
        pharmDistrict === patientDistrict
          ? 1
          : KIGALI.has(pharmDistrict) && KIGALI.has(patientDistrict)
            ? 0.85
            : 0.3;
      proximityScore = proxFactor * W.proximity;
    }

    let priceScore = 0;
    if (isFull && fullStock.length > 0) {
      priceScore =
        fullStock.length === 1
          ? W.price
          : (1 - (r.priceEstimate - minFullPrice) / fullPriceRange) * W.price;
    }

    const score = availScore + openScore + insScore + proximityScore + priceScore;
    const matchPercent = Math.round((score / maxScore) * 100);

    return {
      pharmacy: r.pharmacy,
      availability: r.availability,
      availableCount: r.availableCount,
      totalCount: r.totalCount,
      priceEstimate: r.priceEstimate,
      priceAfterInsurance: priceAfterIns,
      insuranceMatch,
      insuranceSaving,
      rxHasInsurance,
      distanceKm: r.distanceKm,
      roadDistanceKm: r.roadKm,
      score,
      maxScore,
      matchPercent,
      deliveryAvailable: r.pharmacy.isOpen,
      priceRank: priceRankById.get(r.pharmacy.id) ?? totalCandidates,
      fullStockPriceRank: fullStockPriceRankById.get(r.pharmacy.id) ?? 0,
      comparesOnFullStockPrice: isFull,
      distanceRank: distanceRankById.get(r.pharmacy.id) ?? 0,
      totalCandidates,
      rxInsuranceActive: insuranceMatch,
      rank: 1 as 1 | 2 | 3,
      codename: "A" as "A" | "B" | "C",
    };
  });

  return scored
    .sort((a, b) => {
      const aFull = a.availableCount === a.totalCount ? 1 : 0;
      const bFull = b.availableCount === b.totalCount ? 1 : 0;
      if (bFull !== aFull) return bFull - aFull;
      if (a.pharmacy.isOpen !== b.pharmacy.isOpen) {
        return (b.pharmacy.isOpen ? 1 : 0) - (a.pharmacy.isOpen ? 1 : 0);
      }
      return b.score - a.score;
    })
    .slice(0, 3)
    .map((opt, i) => ({
      ...opt,
      rank: (i + 1) as 1 | 2 | 3,
      codename: (["A", "B", "C"][i]) as "A" | "B" | "C",
    }));
}
