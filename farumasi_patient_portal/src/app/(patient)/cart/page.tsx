"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn, formatPrice, getInitials } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { CartEntry } from "@/store/cart-store";
import { cartLineKey } from "@/lib/packaging-classes";
import { cartLineUnitPrice, minQuantityForLine } from "@/lib/cart-pricing";
import { useTranslation } from "@/lib/translations";
import { toast } from "sonner";
import { pharmaciesService, BackendPharmacy, BackendListing, sellerImageSrc } from "@/lib/services/pharmacies.service";
import { partnersService, partnerAsStoreSeller } from "@/lib/services/partners.service";
import { ordersService } from "@/lib/services/orders.service";
import { paymentsService } from "@/lib/services/payments.service";
import {
  prescriptionsService,
  type BackendPrescription,
} from "@/lib/services/prescriptions.service";
import { productsService } from "@/lib/services/products.service";
import type { Pharmacy, Medicine } from "@/types";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Store,
  Check,
  MapPin,
  CreditCard,
  Package,
  Smartphone,
  Brain,
  Star,
  Truck,
  Building2,
  Shield,
  ChevronRight,
  Pill,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  Zap,
  Navigation,
  ExternalLink,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface MedicineAvailability {
  medicineName: string;
  available: boolean;
  stockStatus: string;
  unitPrice: number;
}

interface PharmacyOption {
  pharmacy: Pharmacy;
  rank: 1 | 2 | 3;
  codename: "A" | "B" | "C";
  availability: MedicineAvailability[];
  availableCount: number;
  totalCount: number;
  priceEstimate: number;
  insuranceMatch: boolean;
  insuranceSaving: number;
  distanceKm: number;
  score: number;
  deliveryAvailable: boolean;
  estimatedDeliveryMin: number;
}

function decodeSellMode(instructions: string | null | undefined): "pack" | "partial" {
  return instructions?.startsWith("[sm:partial]") ? "partial" : "pack";
}
function decodeInstructions(instructions: string | null | undefined): string {
  return (instructions ?? "").replace(/^\[sm:(pack|partial)\]\s*/, "");
}

// Adapt backend pharmacy to Pharmacy type for scoring
function adaptBackendPharmacy(p: BackendPharmacy): Pharmacy {
  return {
    id: p.id,
    name: p.name,
    locationName: p.address || p.district,
    coordinates: [p.latitude ?? -1.9441, p.longitude ?? 30.0619] as [number, number],
    supportedInsurances: [],
    isOpen: p.is_open,
    imageUrl: p.image_url ?? p.logo_url ?? "",
    province: "Kigali",
    district: p.district,
    sellerKind: p.sellerKind ?? "pharmacy",
  };
}

// ── Scoring engine ─────────────────────────────────────────────
// Patient insurance — from auth context in production
const PATIENT_INSURANCE = "RSSB";

/**
 * Map<sellerId, Map<productId, { price, status, fulfillmentMin, expiryDate }>>
 * Built from real backend listing data.
 */
type ListingEntry = {
  listingId: string;
  price: number;
  unitPrice: number | null;
  status: string;
  fulfillmentMin: number;
  expiryDate: string | null;
};
type ListingsMap = Map<string, Map<string, ListingEntry>>;

/**
 * Context-aware, normalised scoring engine.
 *
 * Weights (no prescription):
 *   Availability 35 | Price 25 | Delivery 20 | Open 10 | Expiry 5 | Insurance 5
 *
 * Weights (prescription / insurance context):
 *   Availability 35 | Insurance 20 | Price 20 | Delivery 10 | Open 10 | Expiry 5
 *
 * Price and delivery time are normalised within the candidate set so a 200 RWF
 * difference or a 15-minute difference actually changes the ranking.
 */
// Kigali districts — considered neighbours for proximity scoring
const KIGALI = new Set(["Gasabo", "Nyarugenge", "Kicukiro"]);

/** Straight-line distance between two GPS coordinates in km (Haversine). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimated one-way drive time in minutes.
 * Urban Kigali (<15 km): ~25 km/h  |  Highway (beyond): ~70 km/h
 */
function driveMinutes(distKm: number): number {
  if (distKm <= 0) return 0;
  if (distKm < 15) return Math.round(distKm / 25 * 60);
  return Math.round(15 / 25 * 60 + (distKm - 15) / 70 * 60);
}

function scorePharmacies(
  cartLines: CartEntry[],
  pharmacies: Pharmacy[],
  listingsMap: ListingsMap,
  hasPrescription = false,
  isPickup = false,
  patientDistrict = "",
  patientLocation: [number, number] | null = null,
): PharmacyOption[] {
  if (pharmacies.length === 0 || cartLines.length === 0) return [];

  // ── Pass 1: compute raw stats per pharmacy ──────────────────────────────
  const raw = pharmacies
    .map((pharmacy) => {
      const byProduct = listingsMap.get(pharmacy.id) ?? new Map<string, ListingEntry>();
      const availability: MedicineAvailability[] = cartLines.map(({ medicine: med, sellMode, qty }) => {
        const entry = byProduct.get(med.id);
        if (!entry) return { medicineName: med.name, available: false, stockStatus: "unavailable", unitPrice: 0 };

        // Partial sell mode requires the listing to have a unitPrice set.
        // If not, this pharmacy cannot fulfill the partial order for this line.
        if (sellMode === "partial" && (entry.unitPrice == null || entry.unitPrice <= 0)) {
          return { medicineName: med.name, available: false, stockStatus: "no_partial_price", unitPrice: 0 };
        }

        // Use the correct price for the chosen sell mode — never mix partial unit price with pack price.
        const linePrice = sellMode === "partial"
          ? entry.unitPrice! * qty
          : entry.price * qty;

        return {
          medicineName: med.name,
          available: entry.status === "available" || entry.status === "low_stock",
          stockStatus: entry.status,
          unitPrice: linePrice,
        };
      });

      const availableCount  = availability.filter((a) => a.available).length;
      const priceEstimate   = availability.reduce((s, a) => s + a.unitPrice, 0);
      const insuranceMatch  = pharmacy.supportedInsurances.includes(PATIENT_INSURANCE);
      const insuranceSaving = insuranceMatch ? Math.round(priceEstimate * 0.15) : 0;

      const fulfillmentVals = [...byProduct.values()].map((e) => e.fulfillmentMin);
      const avgFulfillment  = fulfillmentVals.length > 0
        ? Math.round(fulfillmentVals.reduce((s, v) => s + v, 0) / fulfillmentVals.length)
        : 60;

      // Days until the nearest-expiring product at this pharmacy
      const now = Date.now();
      const expiryDays = [...byProduct.values()]
        .filter((e) => e.expiryDate)
        .map((e) => Math.floor((new Date(e.expiryDate!).getTime() - now) / 86_400_000));
      const minExpiryDays = expiryDays.length > 0 ? Math.min(...expiryDays) : Infinity;

      // Real distance in km (GPS) — or 0 if location not yet known
      const distanceKm = patientLocation
        ? haversineKm(patientLocation[0], patientLocation[1], pharmacy.coordinates[0], pharmacy.coordinates[1])
        : 0;

      // Travel time: patient drives to pharmacy (pickup) or rider travels to patient (delivery)
      const travelMin = distanceKm > 0 ? driveMinutes(distanceKm) : 0;
      // For delivery: total time = pharmacy prep + rider travel; for pickup: patient drive time
      const estimatedMin = isPickup
        ? (distanceKm > 0 ? travelMin : avgFulfillment)
        : (distanceKm > 0 ? avgFulfillment + travelMin : avgFulfillment);

      return { pharmacy, availability, availableCount, totalCount: cartLines.length,
               priceEstimate, insuranceMatch, insuranceSaving, avgFulfillment, minExpiryDays, distanceKm, estimatedMin };
    })
    .filter((r) => r.availableCount > 0); // drop pharmacies with zero matching stock

  if (raw.length === 0) return [];

  // ── Normalise price and delivery time within this candidate set ──────────
  const prices  = raw.map((r) => r.priceEstimate);
  const times   = raw.map((r) => r.estimatedMin);
  const minPrice = Math.min(...prices),  maxPrice = Math.max(...prices);
  const minTime  = Math.min(...times),   maxTime  = Math.max(...times);
  const priceRange = maxPrice - minPrice || 1;
  const timeRange  = maxTime  - minTime  || 1;

  // ── Context-aware weights ────────────────────────────────────────────────
  const W = isPickup
    ? { avail: 35, ins: 5, price: 20, delivery: 0, open: 10, expiry: 5, proximity: 25 }
    : hasPrescription
    ? { avail: 35, ins: 20, price: 20, delivery: 10, open: 10, expiry: 5, proximity: 0 }
    : { avail: 35, ins:  5, price: 25, delivery: 20, open: 10, expiry: 5, proximity: 0 };

  // ── Pass 2: compute final score ──────────────────────────────────────────
  const scored = raw.map((r) => {
    const availScore    = (r.availableCount / r.totalCount) * W.avail;
    const insScore      = r.insuranceMatch ? W.ins : 0;
    const priceScore    = (1 - (r.priceEstimate - minPrice) / priceRange) * W.price;
    const deliveryScore = (1 - (r.estimatedMin - minTime)  / timeRange) * W.delivery;
    const openScore     = r.pharmacy.isOpen ? W.open : 0;
    // Expiry: >180 days = full, 90-180 = 75%, 30-90 = 50%, <30 days = 10%, no data = neutral 50%
    const expiryFactor  = r.minExpiryDays === Infinity ? 0.5
      : r.minExpiryDays > 180 ? 1.0
      : r.minExpiryDays > 90  ? 0.75
      : r.minExpiryDays > 30  ? 0.5
      : 0.1;
    const expiryScore   = expiryFactor * W.expiry;
    // Proximity: GPS distance (preferred) — falls back to district matching
    const pharmDistrict = r.pharmacy.district;
    const proxFactor = patientLocation
      ? (r.distanceKm < 3 ? 1.0
        : r.distanceKm < 10 ? 0.85
        : r.distanceKm < 30 ? 0.5
        : r.distanceKm < 100 ? 0.1
        : 0)
      : (!patientDistrict ? 0
        : pharmDistrict === patientDistrict ? 1.0
        : KIGALI.has(pharmDistrict) && KIGALI.has(patientDistrict) ? 0.8
        : 0);
    const proximityScore = proxFactor * W.proximity;

    const score = availScore + insScore + priceScore + deliveryScore + openScore + expiryScore + proximityScore;

    return {
      pharmacy:           r.pharmacy,
      availability:       r.availability,
      availableCount:     r.availableCount,
      totalCount:         r.totalCount,
      priceEstimate:      r.priceEstimate,
      insuranceMatch:     r.insuranceMatch,
      insuranceSaving:    r.insuranceSaving,
      distanceKm:         r.distanceKm,
      score,
      deliveryAvailable:  r.pharmacy.isOpen,
      estimatedDeliveryMin: r.estimatedMin,
      rank:    1 as 1 | 2 | 3,
      codename: "A" as "A" | "B" | "C",
    };
  });

  return (scored as PharmacyOption[])
    .sort((a, b) => {
      // Full availability always beats partial — prevents cheap 1/2 outranking complete 2/2
      const aFull = a.availableCount === a.totalCount ? 1 : 0;
      const bFull = b.availableCount === b.totalCount ? 1 : 0;
      if (bFull !== aFull) return bFull - aFull;
      return b.score - a.score;
    })
    .slice(0, 3)
    .map((opt, i) => ({
      ...opt,
      rank:     (i + 1) as 1 | 2 | 3,
      codename: (["A", "B", "C"][i]) as "A" | "B" | "C",
    }));
}

// ── Constants ──────────────────────────────────────────────────
const DISTRICTS = [
  "Bugesera", "Burera", "Gakenke", "Gasabo", "Gatsibo", "Gicumbi",
  "Gisagara", "Huye", "Kamonyi", "Karongi", "Kayonza", "Kicukiro",
  "Kirehe", "Muhanga", "Musanze", "Ngoma", "Ngororero", "Nyabihu",
  "Nyagatare", "Nyamagabe", "Nyamasheke", "Nyanza", "Nyarugenge",
  "Nyaruguru", "Rubavu", "Ruhango", "Rulindo", "Rusizi", "Rutsiro",
  "Rwamagana",
];

type Step = "cart" | "pharmacy" | "details" | "payment" | "confirmed";
// Generate once at module scope so it survives re-renders on confirmed step
const ORDER_NUM = `ORD-${Math.floor(10000 + Math.random() * 89999)}`;

// ── Page ───────────────────────────────────────────────────────
export default function CartPage() {
  const { items: cartItems, setQty, remove, clear } = useCartStore();
  const t = useTranslation();
  const searchParams = useSearchParams();
  const rxId = searchParams.get("rx"); // present when coming from a prescription
  const isLocked = !!rxId;             // prescription cart — items are read-only

  const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "cart",      label: "Cart",     icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: "pharmacy",  label: "Pharmacy", icon: <Brain className="w-3.5 h-3.5" /> },
    { key: "details",   label: "Details",  icon: <MapPin className="w-3.5 h-3.5" /> },
    { key: "payment",   label: "Pay",      icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: "confirmed", label: "Done",     icon: <Package className="w-3.5 h-3.5" /> },
  ];

  const [step, setStep]                       = useState<Step>("cart");
  const [selectedOption, setSelectedOption]   = useState<PharmacyOption | null>(null);
  const [fulfillment, setFulfillment]         = useState<"delivery" | "pickup">("delivery");
  const [patientDistrict, setPatientDistrict] = useState("");
  const [patientLocation, setPatientLocation] = useState<[number, number] | null>(null);
  const [name, setName]                       = useState("");
  const [phone, setPhone]                     = useState("");
  const [street, setStreet]                   = useState("");
  const [district, setDistrict]               = useState("");
  const [notes, setNotes]                     = useState("");
  const [payMethod, setPayMethod]             = useState<"momo" | "airtel">("momo");
  const [deferDeliveryFee, setDeferDeliveryFee] = useState(false);
  const [momoPhone, setMomoPhone]             = useState("");
  const [accessCode, setAccessCode]           = useState("");
  const [isPlacingOrder, setIsPlacingOrder]   = useState(false);
  const [paymentStepLabel, setPaymentStepLabel] = useState("");
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string>("");
  const [pharmacyList, setPharmacyList]       = useState<Pharmacy[]>([]);
  const [listingsMap, setListingsMap]         = useState<ListingsMap>(new Map());
  const [listingsLoading, setListingsLoading] = useState(false);
  const [aiPhase, setAiPhase]               = useState(0);   // 0=idle, 1-4=phases, 5=done
  const [pharmaReady, setPharmaReady]       = useState(false);
  // ── Prescription-locked mode state ──────────────────────────
  const [rxData, setRxData]       = useState<BackendPrescription | null>(null);
  const [rxLoading, setRxLoading] = useState(false);
  /** Catalogue product data for each prescription item that has a linked product_id */
  const [rxProductsMap, setRxProductsMap] = useState<Map<string, Medicine>>(new Map());

  useEffect(() => {
    Promise.all([
      pharmaciesService.listPharmacies(0, 200),
      partnersService.listPublic(0, 100),
    ])
      .then(([pharms, partners]) => {
        setPharmacyList([
          ...pharms.map(adaptBackendPharmacy),
          ...partners.map((p) => adaptBackendPharmacy(partnerAsStoreSeller(p))),
        ]);
      })
      .catch(() => {});
  }, []);

  // Load prescription data when in locked mode
  useEffect(() => {
    if (!rxId) return;
    setRxLoading(true);
    prescriptionsService.getMyPrescriptionsRaw()
      .then((items) => {
        const found = items.find((r) => r.id === rxId) ?? null;
        setRxData(found);
      })
      .catch(() => {})
      .finally(() => setRxLoading(false));
  }, [rxId]);

  // Fetch real product catalogue data for prescription items that have a product_id
  useEffect(() => {
    if (!rxData) return;
    const ids = [...new Set(rxData.items.map((it) => it.product_id).filter(Boolean))] as string[];
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => productsService.getProductById(id).catch(() => null)))
      .then((results) => {
        const m = new Map<string, Medicine>();
        ids.forEach((id, i) => { if (results[i]) m.set(id, results[i]!); });
        setRxProductsMap(m);
      });
  }, [rxData]);

  // Prescription items converted to CartEntry[] so the same listing/scoring logic applies
  const lockedCartItems = useMemo((): CartEntry[] => {
    if (!isLocked || !rxData) return [];
    return rxData.items.map((item) => {
      const product = item.product_id ? rxProductsMap.get(item.product_id) : undefined;
      const sellMode = decodeSellMode(item.instructions);
      // Build a Medicine stub from catalogue data (if available) or just the name
      const medicine: Medicine = product ?? {
        id: item.product_id ?? `rx-${item.id}`,
        name: item.medicine_name,
        description: item.medicine_name,
        price: 0,
        imageUrl: "",
        category: "Prescription",
        additionalCategories: [],
        additionalSubCategories: [],
        requiresPrescription: true,
        rating: 0,
        isPopular: false,
        dosage: item.dosage ?? "",
        sideEffects: "",
        manufacturer: "",
        keywords: [],
        ageDosages: [],
        marketingPharmacies: [],
      };
      return { medicine, qty: item.quantity ?? 1, sellMode };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, rxData, rxProductsMap]);

  // Fetch real stock listings when the patient enters the pharmacy-selection step
  const effectiveItems = isLocked ? lockedCartItems : (Object.values(cartItems) as CartEntry[]);
  const cartKey = effectiveItems.map((e) => e.medicine.id).sort().join(",");
  useEffect(() => {
    if (step !== "pharmacy" && step !== "cart") return;
    const productIds = effectiveItems.map((e) => e.medicine.id).filter(Boolean);
    if (productIds.length === 0) return;
    setListingsLoading(true);
    // Per-item catch so a 404 on a stub/unlinked item doesn't abort the whole fetch
    Promise.all(productIds.map((pid) => pharmaciesService.listingsForProduct(pid).catch(() => [] as BackendListing[])))
      .then((results: BackendListing[][]) => {
        const map: ListingsMap = new Map();
        results.forEach((listings, idx) => {
          const productId = productIds[idx];
          listings.forEach((listing) => {
            const sellerId = listing.pharmacy_id ?? listing.partner_company_id;
            if (!sellerId) return;
            if (!map.has(sellerId)) map.set(sellerId, new Map());
            map.get(sellerId)!.set(productId, {
              listingId: listing.id,
              price: listing.price,
              unitPrice: listing.unit_price ?? null,
              status: listing.availability_status,
              fulfillmentMin: listing.fulfillment_time_minutes,
              expiryDate: listing.expiry_date ?? null,
            });
          });
        });
        setListingsMap(map);
      })
      .catch(() => {})
      .finally(() => setListingsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cartKey]);

  // Request GPS when entering pharmacy step for accurate proximity scoring
  useEffect(() => {
    if (step !== "pharmacy" || patientLocation) return;
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPatientLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { /* denied — fall back to district picker */ },
      { timeout: 6000, maximumAge: 120_000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // AI analysis phase animation — plays for ~2.6s when entering pharmacy step.
  // In locked mode we skip the phase visuals (jump to phase 5) but still wait
  // for listingsLoading to finish before revealing results (via pharmaReady effect).
  useEffect(() => {
    if (step !== "pharmacy") { setAiPhase(0); setPharmaReady(false); return; }
    if (isLocked) { setAiPhase(5); return; }  // skip animation, but pharmaReady still waits for listings
    let cancelled = false;
    setAiPhase(1);
    setPharmaReady(false);
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      await wait(750); if (cancelled) return; setAiPhase(2);
      await wait(750); if (cancelled) return; setAiPhase(3);
      await wait(650); if (cancelled) return; setAiPhase(4);
      await wait(500); if (cancelled) return; setAiPhase(5);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLocked]);

  // Reveal results only when BOTH animation finished AND data loaded
  useEffect(() => {
    if (aiPhase >= 5 && !listingsLoading) setPharmaReady(true);
  }, [aiPhase, listingsLoading]);

  // Use prescription items (locked) or normal cart items
  const enriched = effectiveItems;

  // Pack lines and partial lines must never share a price range — their unit bases
  // are completely different (whole box vs individual tablet/sachet/vial).
  const packLines    = enriched.filter((e) => e.sellMode !== "partial");
  const partialLines = enriched.filter((e) => e.sellMode === "partial");

  // Subtotal: correct price for each line's sell mode.
  // For partial lines: use unitPriceFrom (per-unit). If the catalogue has no unit price
  // yet, we show 0 for that line so it's never confused with the pack price.
  const subtotalPack = packLines.reduce(
    (s, e) => s + (e.medicine.price) * e.qty, 0,
  );
  const subtotalPackMax = packLines.reduce(
    (s, e) => s + (e.medicine.maxPrice ?? e.medicine.price) * e.qty, 0,
  );
  const subtotalPartial = partialLines.reduce(
    (s, e) => s + (e.medicine.unitPriceFrom ?? 0) * e.qty, 0,
  );
  // Combined catalogue-level subtotal (used for delivery fee threshold and display)
  const subtotal = subtotalPack + subtotalPartial;
  // Max only uses pack-item price variation; partial items never inflate the pack range
  const subtotalMax = subtotalPackMax + subtotalPartial;
  // Only show a range when pack items actually have differing catalog min/max prices
  const hasCatalogRange = packLines.length > 0 && subtotalPackMax > subtotalPack;
  const hasPartialLines = partialLines.length > 0;
  const hasPackLines    = packLines.length > 0;
  const deliveryFee  = fulfillment === "pickup" ? 0 : subtotal >= 10000 ? 0 : 1500;
  const insuranceSavings = selectedOption?.insuranceSaving ?? 0;
  // Prescription insurance discount (set by pharmacist, only applies to locked/rx carts)
  const rxInsuranceDiscount = isLocked && rxData?.insurance_discount_pct && subtotal > 0
    ? Math.round(subtotal * rxData.insurance_discount_pct / 100)
    : 0;
  const total        = subtotal + deliveryFee - insuranceSavings - rxInsuranceDiscount;
  // If patient defers the delivery fee, only medicines + insurance savings are due now
  const amountDueNow = total - (deferDeliveryFee && deliveryFee > 0 ? deliveryFee : 0);
  const stepIdx      = STEPS.findIndex((s) => s.key === step);

  const pharmacyOptions = useMemo(
    () => scorePharmacies(enriched, pharmacyList, listingsMap, false, fulfillment === "pickup", patientDistrict, patientLocation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched.map((e: CartEntry) => `${e.medicine.id}:${e.sellMode}:${e.qty}`).join(","), pharmacyList, listingsMap, fulfillment, patientDistrict, patientLocation]
  );

  // Price range across matched pharmacies (for cart summary)
  const allPharmacyPrices = pharmacyOptions.map(o => o.priceEstimate).sort((a, b) => a - b);
  const priceRangeMin = allPharmacyPrices[0] ?? subtotal;
  const priceRangeMax = allPharmacyPrices[allPharmacyPrices.length - 1] ?? subtotal;
  const hasPriceRange = allPharmacyPrices.length > 1 && priceRangeMin !== priceRangeMax;

  // ── Step bar component ────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center justify-between mb-8 px-1">
      {STEPS.map((s, i) => {
        const done   = i < stepIdx;
        const active = i === stepIdx;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all font-bold text-xs",
                done   ? "bg-farumasi-600 text-white" :
                active ? "bg-farumasi-600 text-white ring-4 ring-farumasi-100" :
                         "bg-slate-100 text-slate-400"
              )}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : s.icon}
            </div>
            <p
              className={cn(
                "hidden sm:block text-[11px] font-semibold ml-1",
                active ? "text-farumasi-700" : done ? "text-slate-400" : "text-slate-300"
              )}
            >
              {s.label}
            </p>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1.5",
                  i < stepIdx ? "bg-farumasi-400" : "bg-slate-100"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Empty cart ────────────────────────────────────────────────
  if (enriched.length === 0 && step === "cart" && !isLocked) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingCart className="w-20 h-20 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">{t.cart_empty}</h2>
        <p className="text-slate-500 text-sm mt-1">{t.cart_empty_hint}</p>
        <Link
          href="/store"
          className="mt-6 flex items-center gap-2 bg-farumasi-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-farumasi-700 transition-colors"
        >
          <Store className="w-4 h-4" />
          {t.cart_browse}
        </Link>
      </div>
    );
  }

  // ── STEP 1: Cart review ───────────────────────────────────────
  if (step === "cart") return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={isLocked ? "/prescriptions" : "/store"}
          aria-label={isLocked ? "Back to prescriptions" : "Back to store"}
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.cart_title}</h1>
          <p className="text-slate-500 text-sm">
            {isLocked
              ? `${rxData?.items.length ?? "—"} item${(rxData?.items.length ?? 0) !== 1 ? "s" : ""} · Pharmacist prepared`
              : `${enriched.length} item${enriched.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <StepBar />

      {/* Lock banner + pharmacist notes (prescription mode only) */}
      {isLocked && !rxLoading && (
        <div className="space-y-3 mb-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Cart prepared by our pharmacist — items cannot be modified.
              You can cancel before it reaches the pharmacy.
            </p>
          </div>
          {rxData?.notes && (
            <div className="bg-farumasi-50 border border-farumasi-100 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-farumasi-700 mb-0.5">Pharmacist Notes</p>
              <p className="text-xs text-slate-700">{rxData.notes}</p>
            </div>
          )}
          {rxData?.insurance_provider && rxData.insurance_discount_pct && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <Shield className="w-4 h-4 text-green-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-700">Insurance Applied</p>
                <p className="text-xs text-slate-600">
                  {rxData.insurance_provider} — {rxData.insurance_discount_pct}% discount applied to your total
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading spinner while prescription data is being fetched */}
      {isLocked && rxLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-farumasi-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
      <div className="space-y-3 mb-6">
        {enriched.map(({ medicine, qty, sellMode }, idx) => {
          const lineKey = cartLineKey(medicine.id, sellMode);
          const minQty  = minQuantityForLine(medicine, sellMode);
          const unitLabel = sellMode === "partial"
            ? (medicine.partialUnitName ?? "unit")
            : (medicine.unitsPerPack && medicine.unitsPerPack > 1 ? "pack" : "item");
          const linePrice = cartLineUnitPrice(medicine, sellMode);
          // Pharmacist per-item instructions (prescription mode)
          const rxItem = isLocked ? (rxData?.items[idx] ?? null) : null;
          const pharmacistNotes = rxItem ? decodeInstructions(rxItem.instructions) : null;
          // For locked items linked to a real product, make name a clickable link
          const hasProductLink = isLocked && !medicine.id.startsWith("rx-");
          // Price range for pack items
          const packMax = sellMode === "pack" && medicine.maxPrice && medicine.maxPrice > medicine.price
            ? medicine.maxPrice : null;
          return (
            <div key={lineKey} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 items-start">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {medicine.imageUrl ? (
                  <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">💊</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {hasProductLink ? (
                  <Link href={`/store/${medicine.id}`}
                    className="text-sm font-bold text-farumasi-700 hover:underline flex items-center gap-1 group">
                    <span className="truncate">{medicine.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity shrink-0" />
                  </Link>
                ) : (
                  <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
                )}
                <p className="text-xs text-farumasi-600 font-medium mt-0.5">{medicine.category}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                  {sellMode === "partial" ? `Partial · per ${unitLabel}` : "Whole pack"}
                </p>
                {sellMode === "partial" && linePrice === 0 ? (
                  <p className="text-xs text-slate-400 italic mt-1.5">Price set at pharmacy</p>
                ) : packMax ? (
                  <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">
                    {formatPrice(linePrice)} – {formatPrice(packMax)}
                    <span className="text-xs font-medium text-slate-500"> / {unitLabel}</span>
                  </p>
                ) : (
                  <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">
                    {formatPrice(linePrice)}
                    <span className="text-xs font-medium text-slate-500"> / {unitLabel}</span>
                  </p>
                )}
                {pharmacistNotes && (
                  <p className="text-xs text-farumasi-600 italic mt-0.5">{pharmacistNotes}</p>
                )}
              </div>
              {isLocked ? (
                /* Locked mode — show sell-mode badge + qty, no controls */
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    sellMode === "partial" ? "bg-purple-100 text-purple-700" : "bg-farumasi-100 text-farumasi-700"
                  )}>
                    {sellMode === "partial" ? "Partial" : "Whole pack"}
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1">×{qty}</p>
                </div>
              ) : (
                /* Normal mode — remove + qty controls */
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => remove(lineKey)} aria-label={`Remove ${medicine.name} from cart`}
                    className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-2 py-1">
                    <button onClick={() => setQty(lineKey, qty - 1)} disabled={qty <= minQty}
                      className="w-7 h-7 rounded-xl bg-white font-bold text-slate-600 hover:bg-farumasi-50 flex items-center justify-center shadow-sm disabled:opacity-40">
                      −
                    </button>
                    <span className="text-sm font-bold text-slate-900 w-5 text-center">{qty}</span>
                    <button onClick={() => setQty(lineKey, qty + 1)}
                      className="w-7 h-7 rounded-xl bg-farumasi-600 text-white font-bold hover:bg-farumasi-700 flex items-center justify-center">
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      )}

      {/* ── Cart summary (unified — works for both normal and prescription mode) ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">{t.cart_summary}</h2>
        <div className="space-y-2.5 text-sm">
          {/* One row per medicine with name, qty, mode, and price */}
          {enriched.map(({ medicine, qty, sellMode }) => {
            const itemLinePrice = cartLineUnitPrice(medicine, sellMode);
            const itemTotalMin  = itemLinePrice * qty;
            // Price range: show if catalogue has a max price > min (pack items only)
            const itemMaxPrice  = sellMode === "pack" && medicine.maxPrice && medicine.maxPrice > medicine.price
              ? medicine.maxPrice
              : null;
            const itemTotalMax  = itemMaxPrice ? itemMaxPrice * qty : null;
            const unitLabel = sellMode === "partial"
              ? (medicine.partialUnitName ?? "unit")
              : "pack";
            return (
              <div key={cartLineKey(medicine.id, sellMode)} className="flex justify-between text-slate-600 gap-2">
                <span className="truncate max-w-[60%]">
                  {medicine.name}
                  <span className="text-slate-400 text-xs ml-1">
                    ×{qty} {unitLabel}{sellMode === "partial" ? "" : ""}
                  </span>
                </span>
                {itemLinePrice === 0 ? (
                  <span className="text-slate-400 text-xs italic shrink-0">At pharmacy</span>
                ) : itemTotalMax ? (
                  <span className="font-medium shrink-0">{formatPrice(itemTotalMin)} – {formatPrice(itemTotalMax)}</span>
                ) : (
                  <span className="font-medium shrink-0">{formatPrice(itemTotalMin)}</span>
                )}
              </div>
            );
          })}

          {/* Subtotal — correctly sums pack + partial from catalogue */}
          <div className="flex justify-between text-slate-600 border-t border-dashed border-slate-100 pt-2">
            <span>{t.cart_subtotal}</span>
            {(() => {
              const partialUnpriced = hasPartialLines && subtotalPartial === 0;
              if (partialUnpriced && !hasPackLines) {
                return <span className="text-slate-400 text-xs italic">Confirmed at pharmacy</span>;
              }
              if (partialUnpriced && hasPackLines) {
                return (
                  <span className="font-medium text-slate-700">
                    {formatPrice(subtotalPack)}
                    <span className="text-slate-400 text-xs ml-1">+ partial</span>
                  </span>
                );
              }
              // Both priced — show the real sum
              return (
                <span className="font-semibold text-slate-800">
                  {hasCatalogRange
                    ? `${formatPrice(subtotalPack + subtotalPartial)} – ${formatPrice(subtotalPackMax + subtotalPartial)}`
                    : formatPrice(subtotalPack + subtotalPartial)}
                </span>
              );
            })()}
          </div>

          {/* Delivery fee */}
          <div className="flex justify-between text-slate-600">
            <span>{t.cart_delivery_fee}</span>
            <span className="text-slate-400 text-xs italic">Confirmed at pharmacy</span>
          </div>

          {/* Hint when catalogue has a price range (min ≠ max across pharmacies) */}
          {hasCatalogRange && (
            <p className="text-xs text-slate-400 italic">
              Prices confirmed when you select a pharmacy
            </p>
          )}

          {/* Total */}
          <div className="border-t border-slate-100 pt-2.5 flex justify-between">
            <span className="font-bold text-slate-900 text-base">{t.cart_total}</span>
            {(() => {
              const partialUnpriced = hasPartialLines && subtotalPartial === 0;
              if (partialUnpriced && !hasPackLines) {
                return <span className="text-base font-semibold text-slate-500 italic">See at pharmacy</span>;
              }
              if (partialUnpriced && hasPackLines) {
                return (
                  <span className="font-extrabold text-farumasi-700 text-lg">
                    {hasCatalogRange
                      ? `${formatPrice(subtotalPack)} – ${formatPrice(subtotalPackMax)}`
                      : formatPrice(subtotalPack)}
                    <span className="text-sm font-normal text-slate-400 ml-1">+ partial</span>
                  </span>
                );
              }
              const totalMin = subtotalPack + subtotalPartial;
              const totalMax = subtotalPackMax + subtotalPartial;
              return (
                <span className="font-extrabold text-farumasi-700 text-lg">
                  {hasCatalogRange
                    ? `${formatPrice(totalMin)} – ${formatPrice(totalMax)}`
                    : formatPrice(totalMin)}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 bg-farumasi-50 rounded-2xl px-3 py-2.5 border border-farumasi-100">
          <Brain className="w-4 h-4 text-farumasi-600 shrink-0" />
          <p className="text-xs text-farumasi-700 font-medium">
            Next: FARUMASI AI finds the best-matched pharmacies for your medicines
          </p>
        </div>

        <button
          onClick={() => setStep("pharmacy")}
          className="w-full mt-4 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-base transition-colors py-3.5 flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          Find Best Pharmacy
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );

  // ── STEP 2: Pharmacy selection (names hidden) ─────────────────
  if (step === "pharmacy") return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setStep("cart")}
          aria-label="Back to cart"
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Choose Your Pharmacy</h1>
          <p className="text-slate-500 text-sm">AI-ranked by: stock · price · delivery · expiry</p>
        </div>
      </div>

      <StepBar />

      {/* Fulfillment mode toggle — affects AI ranking and pricing */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["delivery", "pickup"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFulfillment(mode)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all",
              fulfillment === mode
                ? "border-farumasi-500 bg-farumasi-50 text-farumasi-700"
                : "border-slate-100 bg-white text-slate-500 hover:border-farumasi-200"
            )}
          >
            {mode === "delivery"
              ? <><Truck className="w-4 h-4" /> Home Delivery</>
              : <><Building2 className="w-4 h-4" /> Pickup &middot; Free</>}
          </button>
        ))}
      </div>

      {/* For pickup: district picker shown only when GPS not yet granted */}
      {fulfillment === "pickup" && !patientLocation && (
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-farumasi-600 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Your pickup district:</span>
          <select
            value={patientDistrict}
            onChange={(e) => setPatientDistrict(e.target.value)}
            className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 bg-white outline-none focus:border-farumasi-400 transition-all"
          >
            <option value="">Select district…</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Pharmacy names are hidden</span> until you complete
          payment — ensuring fair pricing and stock availability across our network.
        </p>
      </div>

      {/* Pharmacy option cards — AI analysis / empty / results */}
      {!pharmaReady ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
          {/* Simple loading spinner for prescription mode; full AI animation for normal mode */}
          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-farumasi-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Finding best pharmacies for your prescription…</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-farumasi-600 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Farumasi AI</p>
                  <p className="text-xs text-slate-400">Finding your best match…</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-farumasi-500 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
              {/* Phase steps */}
              <div className="space-y-3">
                {([
                  {
                    label: `Scanning ${pharmacyList.length || "—"} partner pharmacies`,
                    sub: "Checking network availability",
                  },
                  {
                    label: "Verifying stock for your items",
                    sub: enriched.length > 0
                      ? enriched.slice(0, 2).map((e: CartEntry) => e.medicine.name).join(", ") +
                        (enriched.length > 2 ? ` +${enriched.length - 2} more` : "")
                      : "Your cart items",
                  },
                  {
                    label: "Calculating proximity & delivery times",
                    sub: patientLocation ? "GPS location detected" : "District-based estimate",
                  },
                  {
                    label: "Ranking by compatibility score",
                    sub: "Availability · price · speed · proximity",
                  },
                ] as { label: string; sub: string }[]).map((phase, idx) => {
                  const phaseNum = idx + 1;
                  const done   = aiPhase > phaseNum;
                  const active = aiPhase === phaseNum;
                  if (aiPhase < phaseNum) return null;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300",
                          done ? "bg-green-500" : "bg-farumasi-100"
                        )}
                      >
                        {done
                          ? <Check className="w-3 h-3 text-white" />
                          : active && <div className="w-2 h-2 rounded-full bg-farumasi-500 animate-pulse" />}
                      </div>
                      <div>
                        <p className={cn("text-xs font-semibold leading-tight transition-colors", done ? "text-slate-400" : "text-slate-800")}>
                          {phase.label}
                          {active && <span className="text-farumasi-500 animate-pulse">…</span>}
                        </p>
                        {(done || active) && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{phase.sub}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-5 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-farumasi-400 to-farumasi-600 transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (Math.max(0, aiPhase - 1) / 4) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      ) : pharmacyOptions.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm px-6 mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="font-bold text-slate-800 mb-1">No matching pharmacies found</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            None of our partner pharmacies currently have all your cart items in stock.
            This happens when a product is temporarily unavailable or hasn&apos;t been listed nearby yet.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded-2xl px-4 py-3 text-left space-y-1.5 mb-4">
            <p className="font-semibold text-slate-600 mb-1.5">What you can do:</p>
            <p>• Remove items one by one and retry — partial matches may appear</p>
            <p>• Check back later — pharmacy stock is updated regularly</p>
            <p>• Contact support if an item is urgently needed</p>
          </div>
          <button
            onClick={() => setStep("cart")}
            className="text-sm font-semibold text-farumasi-600 hover:underline"
          >
            ← {isLocked ? "Back to cart" : "Edit Cart"}
          </button>
        </div>
      ) : (
      <div className="space-y-3 mb-6">
        {pharmacyOptions.map((opt) => {
          const isSelected  = selectedOption?.codename === opt.codename;
          const isBest      = opt.rank === 1;
          const rank1       = pharmacyOptions[0];
          // Only award secondary badges when the card is STRICTLY better than #1 on that axis
          const isBestValue = !isBest && opt.priceEstimate < rank1.priceEstimate;
          const isFastest   = !isBest && !isBestValue && opt.estimatedDeliveryMin < rank1.estimatedDeliveryMin;
          // Per-card cost: medicines + applicable delivery fee
          const cardDeliveryFee = fulfillment === "pickup" ? 0 : opt.priceEstimate >= 10000 ? 0 : 1500;
          const cardTotal       = opt.priceEstimate - opt.insuranceSaving + cardDeliveryFee;

          return (
            <button
              key={opt.codename}
              onClick={() => setSelectedOption(opt)}
              className={cn(
                "w-full text-left rounded-3xl border-2 p-4 transition-all",
                isSelected
                  ? "border-farumasi-500 bg-farumasi-50 shadow-md"
                  : "border-slate-100 bg-white hover:border-farumasi-200 hover:shadow-sm"
              )}
            >
              {/* AI match strength bar */}
              <div className="w-full h-0.5 rounded-full bg-slate-100 mb-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    isBest ? "from-farumasi-400 to-farumasi-600"
                      : opt.rank === 2 ? "from-slate-300 to-slate-500"
                      : "from-slate-200 to-slate-300"
                  )}
                  style={{ width: `${Math.min(100, Math.round((opt.score / rank1.score) * 100))}%` }}
                />
              </div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const img = sellerImageSrc({ image_url: opt.pharmacy.imageUrl });
                    return (
                      <div
                        className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden",
                          !img &&
                            (isBest
                              ? "bg-farumasi-600 text-white font-black text-base"
                              : opt.rank === 2
                                ? "bg-slate-700 text-white font-black text-base"
                                : "bg-slate-200 text-slate-600 font-black text-base"),
                        )}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={opt.pharmacy.name} className="w-full h-full object-cover" />
                        ) : (
                          opt.codename
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        Pharmacy {opt.codename}
                      </span>
                      {isBest && (
                        <span className="text-[10px] font-bold bg-farumasi-600 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> Best Match
                        </span>
                      )}
                      {isBestValue && (
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CreditCard className="w-2.5 h-2.5" /> Best Value
                        </span>
                      )}
                      {isFastest && (
                        <span className="text-[10px] font-bold bg-violet-500 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> Fastest
                        </span>
                      )}
                      {!isBest && (
                        <span className="text-[10px] text-slate-400 tabular-nums font-medium">
                          {Math.round((opt.score / rank1.score) * 100)}% match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {opt.insuranceMatch && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          <Shield className="w-2.5 h-2.5" /> {PATIENT_INSURANCE} Accepted
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {opt.pharmacy.district}
                        {opt.distanceKm > 0 && ` \u00b7 ${opt.distanceKm.toFixed(1)} km`}
                      </span>
                    </div>
                    {/* AI insight — rank 1 only */}
                    {isBest && (() => {
                      const why: string[] = [];
                      if (opt.availableCount === opt.totalCount) why.push("Full stock");
                      else why.push(`${opt.availableCount}/${opt.totalCount} items available`);
                      if (opt.insuranceMatch) why.push(`${PATIENT_INSURANCE} covered`);
                      const isNearest = opt.distanceKm > 0 &&
                        pharmacyOptions.every(o => o === opt || o.distanceKm === 0 || o.distanceKm >= opt.distanceKm);
                      if (isNearest) why.push("Nearest to you");
                      return why.length > 0 ? (
                        <p className="text-[10px] text-farumasi-600 font-semibold mt-1 leading-tight">
                          Why: {why.slice(0, 3).join(" \u00b7 ")}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1",
                    isSelected ? "border-farumasi-600 bg-farumasi-600" : "border-slate-300"
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Medicine availability chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {opt.availability.map((med, medIdx) => (
                  <span
                    key={`${med.medicineName}-${medIdx}`}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                      med.available
                        ? med.stockStatus === "low_stock"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    )}
                  >
                    {med.available ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {med.medicineName.length > 18
                      ? med.medicineName.slice(0, 17) + "…"
                      : med.medicineName}
                    {med.stockStatus === "low_stock" && " (low)"}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              {(() => {
                const travelMin = driveMinutes(opt.distanceKm);
                const prepMin   = Math.max(0, opt.estimatedDeliveryMin - travelMin);
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Pill className="w-3.5 h-3.5 text-farumasi-500" />
                        <span className="font-semibold">{opt.availableCount}/{opt.totalCount}</span>
                        <span className="text-slate-400">medicines</span>
                      </div>
                      {fulfillment === "pickup" && opt.distanceKm > 0 && (
                        <div className="flex items-center gap-1 text-xs text-farumasi-600">
                          <Navigation className="w-3.5 h-3.5" />
                          <span className="font-medium">~{travelMin} min drive &middot; {opt.distanceKm.toFixed(1)} km</span>
                        </div>
                      )}
                      {fulfillment === "pickup" && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{prepMin} min prep</span>
                        </div>
                      )}
                      {opt.deliveryAvailable && fulfillment === "delivery" && (
                        <div className="flex items-center gap-1 text-xs text-farumasi-600">
                          <Truck className="w-3.5 h-3.5" />
                          <span className="font-medium">~{opt.estimatedDeliveryMin} min delivery</span>
                        </div>
                      )}
                    </div>
                    {/* Breakdown line: only in delivery mode when GPS distance is known */}
                    {fulfillment === "delivery" && opt.distanceKm > 0 && (
                      <p className="text-[10px] text-slate-400 leading-tight">
                        ~{prepMin}min prep &plus; ~{travelMin}min travel from you
                      </p>
                    )}
                  </div>
                );
              })()}
              {/* Pricing summary */}
              <div className="mt-2.5 flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span>{formatPrice(opt.priceEstimate)} medicines</span>
                  {cardDeliveryFee > 0 && (
                    <span className="text-slate-400">+ {formatPrice(cardDeliveryFee)} delivery</span>
                  )}
                  {cardDeliveryFee === 0 && fulfillment === "delivery" && (
                    <span className="text-farumasi-600 font-medium">+ free delivery</span>
                  )}
                  {fulfillment === "pickup" && (
                    <span className="text-green-600 font-medium">+ free pickup</span>
                  )}
                  {opt.insuranceSaving > 0 && (
                    <span className="text-green-600">· −{formatPrice(opt.insuranceSaving)} ins.</span>
                  )}
                </div>
                <div className="text-sm font-extrabold text-farumasi-700 shrink-0 ml-2">
                  Total {formatPrice(cardTotal)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )} {/* end listingsLoading / pharmacyOptions ternary */}

      <button
        disabled={!selectedOption || !pharmaReady}
        onClick={() => setStep("details")}
        className={cn(
          "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5 flex items-center justify-center gap-1",
          selectedOption && pharmaReady
            ? "bg-farumasi-600 hover:bg-farumasi-700"
            : "bg-slate-200 cursor-not-allowed text-slate-400"
        )}
      >
        {selectedOption ? `Continue with Pharmacy ${selectedOption.codename}` : "Continue with Pharmacy …"}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  // ── STEP 3: Delivery details ──────────────────────────────────
  if (step === "details") {
    const needsAddress = fulfillment === "delivery";
    const canContinue  =
      name.trim().length > 0 &&
      phone.trim().length > 0 &&
      accessCode.trim().length >= 4 &&
      (!needsAddress || (street.trim().length > 0 && !!district));

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep("pharmacy")}
            aria-label="Back to pharmacy selection"
            className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
            {fulfillment === "pickup" ? "Pickup Details" : "Delivery Details"}
          </h1>
            <p className="text-slate-500 text-sm">How would you like to receive your order?</p>
          </div>
        </div>

        <StepBar />

        {/* Pickup info — reminder of chosen mode */}
        {fulfillment === "pickup" && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
            <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Pickup selected — no delivery fee.</span>{" "}
              The pharmacy address will be revealed after payment.
            </p>
          </div>
        )}

        {/* Contact details — required for both pickup and delivery */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 mb-5">
          <h3 className="text-sm font-bold text-slate-700">Contact Details</h3>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              {t.cart_full_name} <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amina Uwimana"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              {t.cart_phone} <span className="text-red-400">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 7XX XXX XXX"
              type="tel"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
            />
          </div>
        </div>

        {/* Address fields — delivery only */}
        {fulfillment === "delivery" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 mb-5">
            <h3 className="text-sm font-bold text-slate-700">Delivery Address</h3>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                {t.cart_street} <span className="text-red-400">*</span>
              </label>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. KG 15 Ave, Gisozi"
                className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                {t.cart_district} <span className="text-red-400">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all bg-white"
              >
                <option value="">Select district…</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                {t.cart_notes}{" "}
                <span className="text-slate-300 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2nd floor, blue gate…"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* Access code — required for pickup and delivery security */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Order Access Code</h3>
            <p className="text-xs text-slate-500 mt-1">
              {fulfillment === "pickup"
                ? "Show this code at the pharmacy counter to collect your medicines."
                : "Give this code to the rider at the door to confirm delivery."}
              {" "}Minimum 4 characters.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Access Code <span className="text-red-400">*</span>
            </label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="e.g. LION2025"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 font-mono tracking-widest outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
            />
          </div>
        </div>

        <button
          disabled={!canContinue}
          onClick={() => setStep("payment")}
          className={cn(
            "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5",
            canContinue
              ? "bg-farumasi-600 hover:bg-farumasi-700"
              : "bg-slate-200 cursor-not-allowed text-slate-400"
          )}
        >
          {t.cart_continue_payment}
        </button>
      </div>
    );
  }

  // ── STEP 4: Payment ───────────────────────────────────────────
  if (step === "payment") {
    const canPlace   = momoPhone.trim().length >= 9 && !!selectedOption;

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep("details")}
            aria-label="Back to delivery details"
            className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.cart_payment_title}</h1>
            <p className="text-slate-500 text-sm">Choose how you want to pay</p>
          </div>
        </div>

        <StepBar />

        <div className="space-y-3 mb-6">
          {(
            [
              {
                key: "momo" as const,
                Icon: Smartphone,
                iconColor: "text-yellow-600",
                label: t.cart_momo,
                desc: "Push notification to your MTN number",
              },
              {
                key: "airtel" as const,
                Icon: Smartphone,
                iconColor: "text-red-500",
                label: t.cart_airtel,
                desc: "Coming soon — use MTN MoMo for now",
              },
            ] as const
          ).map(({ key, Icon, iconColor, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => key === "momo" && setPayMethod(key)}
              disabled={key === "airtel"}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all",
                key === "airtel" && "opacity-50 cursor-not-allowed",
                payMethod === key && key === "momo"
                  ? "border-farumasi-500 bg-farumasi-50"
                  : "border-slate-100 bg-white hover:border-farumasi-200"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                  payMethod === key ? "bg-farumasi-50" : "bg-slate-50"
                )}
              >
                <Icon className={cn("w-5 h-5", iconColor)} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  payMethod === key ? "border-farumasi-600 bg-farumasi-600" : "border-slate-300"
                )}
              >
                {payMethod === key && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>

        {/* MoMo / Airtel phone number — always required */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              {payMethod === "momo" ? "MTN" : "Airtel"} {t.cart_momo_number}{" "}
              <span className="text-red-400">*</span>
            </label>
            <input
              value={momoPhone}
              onChange={(e) => setMomoPhone(e.target.value)}
              placeholder={
                payMethod === "momo" ? "e.g. 0781 234 567" : "e.g. 0731 234 567"
              }
              type="tel"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
            />
          </div>

        {/* Deferred delivery fee option — delivery only when fee applies */}
        {fulfillment === "delivery" && deliveryFee > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Delivery Fee</p>
            <div className="space-y-2">
              {([
                {
                  defer: false,
                  title: "Pay now",
                  desc: `${formatPrice(deliveryFee)} charged with your medicines`,
                },
                {
                  defer: true,
                  title: "Pay after delivery arrives",
                  desc: "Charged to your mobile money when delivered — no cash",
                },
              ] as const).map(({ defer, title, desc }) => (
                <button
                  key={String(defer)}
                  onClick={() => setDeferDeliveryFee(defer)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                    deferDeliveryFee === defer
                      ? "border-farumasi-500 bg-farumasi-50"
                      : "border-slate-100 bg-slate-50 hover:border-farumasi-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      deferDeliveryFee === defer ? "border-farumasi-600 bg-farumasi-600" : "border-slate-300"
                    )}
                  >
                    {deferDeliveryFee === defer && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{t.cart_subtotal}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.cart_delivery_fee}</span>
              <span className={deliveryFee === 0 ? "text-farumasi-600 font-bold" : ""}>
                {deliveryFee === 0
                  ? fulfillment === "pickup"
                    ? "Free (Pickup)"
                    : t.cart_free
                  : deferDeliveryFee
                  ? (
                    <span className="text-slate-400 text-xs italic">
                      {formatPrice(deliveryFee)} · after delivery
                    </span>
                  )
                  : formatPrice(deliveryFee)}
              </span>
            </div>
            {insuranceSavings > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> {PATIENT_INSURANCE} discount
                </span>
                <span className="font-bold">−{formatPrice(insuranceSavings)}</span>
              </div>
            )}
            {rxInsuranceDiscount > 0 && rxData?.insurance_provider && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{rxData.insurance_provider} ({rxData.insurance_discount_pct}% off)</span>
                </span>
                <span className="font-bold">−{formatPrice(rxInsuranceDiscount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between">
              <span className="font-bold text-slate-900">{deferDeliveryFee && deliveryFee > 0 ? "Due now" : t.cart_total}</span>
              <span className="font-extrabold text-farumasi-700 text-lg">
                {formatPrice(amountDueNow)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            <span>Pharmacy name revealed after payment</span>
          </div>
        </div>

        <button
          disabled={!canPlace || isPlacingOrder}
          onClick={async () => {
            if (!canPlace || isPlacingOrder) return;
            setIsPlacingOrder(true);
            setPaymentStepLabel("Creating order…");
            try {
              const deliveryAddr = fulfillment === "delivery"
                ? `${street}, ${district}`
                : undefined;

              const orderItems = enriched.map((e: CartEntry) => {
                const sellerId = selectedOption?.pharmacy.id;
                const listingEntry = sellerId
                  ? listingsMap.get(sellerId)?.get(e.medicine.id)
                  : undefined;

                if (listingEntry?.listingId) {
                  return {
                    product_listing_id: listingEntry.listingId,
                    quantity: e.qty,
                    sell_mode: e.sellMode,
                  };
                }

                const unitPrice = cartLineUnitPrice(e.medicine, e.sellMode, listingEntry ?? undefined);
                return {
                  product_name: e.medicine.name,
                  quantity: e.qty,
                  sell_mode: e.sellMode,
                  unit_price: unitPrice,
                };
              });
              const seller = selectedOption?.pharmacy;
              const isPartnerSeller = seller?.sellerKind === "partner";
              const result = await ordersService.createOrder({
                prescription_id: rxId ?? undefined,
                pharmacy_id: isPartnerSeller ? undefined : seller?.id,
                partner_company_id: isPartnerSeller ? seller?.id : undefined,
                delivery_method: fulfillment,
                delivery_address: deliveryAddr,
                delivery_latitude: fulfillment === "delivery"
                  ? patientLocation?.[0]
                  : undefined,
                delivery_longitude: fulfillment === "delivery"
                  ? patientLocation?.[1]
                  : undefined,
                notes: notes || undefined,
                items: orderItems,
                patient_access_code: accessCode.trim() || undefined,
                defer_delivery_fee: deferDeliveryFee,
              });

              const orderId = result.id;
              const orderCode = result.order_code ?? result.id ?? ORDER_NUM;

              if (amountDueNow > 0) {
                setPaymentStepLabel("Starting MTN MoMo payment…");
                const init = await paymentsService.initiateMomo(orderId, momoPhone);
                if (init.payment_status !== "paid") {
                  setPaymentStepLabel("Waiting for MoMo approval on your phone…");
                  await paymentsService.waitUntilPaid(orderId);
                }
              }

              setConfirmedOrderCode(orderCode);
              if (!isLocked) clear();
              setStep("confirmed");
            } catch (err) {
              const detail =
                (err as { response?: { data?: { detail?: string } } })?.response
                  ?.data?.detail;
              toast.error(
                typeof detail === "string"
                  ? detail
                  : err instanceof Error
                  ? err.message
                  : "Could not complete checkout. Please try again."
              );
            } finally {
              setIsPlacingOrder(false);
              setPaymentStepLabel("");
            }
          }}
          className={cn(
            "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5",
            canPlace && !isPlacingOrder
              ? "bg-farumasi-600 hover:bg-farumasi-700"
              : "bg-slate-200 cursor-not-allowed text-slate-400"
          )}
        >
          {isPlacingOrder
            ? paymentStepLabel || "Processing…"
            : `${t.cart_place_order} · ${formatPrice(amountDueNow)}`}
        </button>
        {isPlacingOrder && amountDueNow > 0 && (
          <p className="text-center text-xs text-slate-500 mt-2">
            Approve the MTN MoMo request on {momoPhone.trim()} to continue.
          </p>
        )}
      </div>
    );
  }

  // ── STEP 5a: Confirmed — PICKUP ───────────────────────────────
  if (fulfillment === "pickup") {
    const orderCode = confirmedOrderCode || ORDER_NUM;
    const mapsUrl   = selectedOption
      ? `https://www.google.com/maps?q=${selectedOption.pharmacy.coordinates[0]},${selectedOption.pharmacy.coordinates[1]}`
      : "#";

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col items-center min-h-[60vh]">
        <StepBar />

        {/* Header */}
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Ready for Pickup!</h1>
          <p className="text-slate-500 text-sm">
            Payment confirmed · Head to the pharmacy
          </p>
          <span className="mt-3 px-4 py-1.5 bg-farumasi-50 text-farumasi-700 font-bold text-sm rounded-full border border-farumasi-200">
            {orderCode}
          </span>
        </div>

        {/* Access code reminder */}
        {accessCode && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-700">Your Access Code</p>
              <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{accessCode}</p>
              <p className="text-xs text-amber-600 mt-0.5">Show this at the pharmacy counter</p>
            </div>
          </div>
        )}

        {/* Pharmacy reveal */}
        {selectedOption && (
          <div className="w-full bg-gradient-to-br from-farumasi-600 to-farumasi-700 rounded-3xl p-5 mb-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 opacity-70" />
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Your Pharmacy</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-extrabold">{selectedOption.pharmacy.name}</p>
                <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedOption.pharmacy.locationName}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {selectedOption.pharmacy.district} District · Free pickup
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location & Directions */}
        {selectedOption && (
          <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Location &amp; Directions
            </p>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-farumasi-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedOption.pharmacy.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedOption.pharmacy.locationName}</p>
                <p className="text-xs text-slate-500">{selectedOption.pharmacy.district} District</p>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        )}

        <div className="w-full">
          <Link
            href="/store"
            className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors"
          >
            <Store className="w-4 h-4" />
            {t.cart_continue_shopping}
          </Link>
        </div>
      </div>
    );
  }

  // ── STEP 5b: Confirmed — DELIVERY ─────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col items-center min-h-[60vh]">
      <StepBar />

      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full bg-farumasi-50 border-4 border-farumasi-200 flex items-center justify-center mb-5">
          <Check className="w-10 h-10 text-farumasi-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          {t.cart_confirmed_title}
        </h1>
        <p className="text-slate-500 text-sm">{t.cart_confirmed_subtitle}</p>
        <span className="mt-3 px-4 py-1.5 bg-farumasi-50 text-farumasi-700 font-bold text-sm rounded-full border border-farumasi-200">
          {confirmedOrderCode || ORDER_NUM}
        </span>
      </div>

      {/* Access code reminder */}
      {accessCode && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">Your Access Code</p>
            <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{accessCode}</p>
            <p className="text-xs text-amber-600 mt-0.5">Give this to the rider when they arrive</p>
          </div>
        </div>
      )}

      {/* Pharmacy reveal */}
      {selectedOption && (
        <div className="w-full bg-gradient-to-br from-farumasi-600 to-farumasi-700 rounded-3xl p-5 mb-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 opacity-70" />
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Your Pharmacy</p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-extrabold">{selectedOption.pharmacy.name}</p>
              <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {selectedOption.pharmacy.locationName}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Delivery in ~{selectedOption.estimatedDeliveryMin} min
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-5">
        {street && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Deliver to</span>
            <span className="font-bold text-slate-900 text-right max-w-[200px]">
              {street}, {district}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Payment</span>
          <span className="font-bold text-slate-900">
            {payMethod === "momo" ? "MTN MoMo" : "Airtel Money"}
          </span>
        </div>
        {insuranceSavings > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Insurance savings
            </span>
            <span className="font-bold text-green-700">−{formatPrice(insuranceSavings)}</span>
          </div>
        )}
        {rxInsuranceDiscount > 0 && rxData?.insurance_provider && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              {rxData.insurance_provider} ({rxData.insurance_discount_pct}% off)
            </span>
            <span className="font-bold text-green-700">−{formatPrice(rxInsuranceDiscount)}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 flex justify-between">
          <span className="font-bold text-slate-900">
            {deferDeliveryFee && deliveryFee > 0 ? "Charged now" : "Total charged"}
          </span>
          <span className="font-extrabold text-farumasi-700">{formatPrice(amountDueNow)}</span>
        </div>
        {deferDeliveryFee && deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-slate-500">
            <span>Delivery fee (after delivery)</span>
            <span className="font-medium">{formatPrice(deliveryFee)}</span>
          </div>
        )}
      </div>

      {/* Deferred delivery fee notice */}
      {deferDeliveryFee && deliveryFee > 0 && (
        <div className="w-full flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
          <Truck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Delivery fee billed after arrival.</span>{" "}
            {formatPrice(deliveryFee)} will be charged to your{" "}
            {payMethod === "momo" ? "MTN MoMo" : "Airtel Money"} once your order is delivered.
          </p>
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        <Link
          href="/orders"
          className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Package className="w-4 h-4" />
          {t.orders_track}
        </Link>
        <Link
          href="/store"
          className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors"
        >
          <Store className="w-4 h-4" />
          {t.cart_continue_shopping}
        </Link>
      </div>
    </div>
  );
}
