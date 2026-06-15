"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn, formatPrice, getInitials } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { CartEntry } from "@/store/cart-store";
import { cartLineKey } from "@/lib/packaging-classes";
import { cartLineUnitPrice, minQuantityForLine, lineUnitPriceRange, lineTotalPriceRange } from "@/lib/cart-pricing";
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
import { patientsService } from "@/lib/services/patients.service";
import { useAuthStore } from "@/store/auth-store";
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
  Navigation,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  PharmacyMatchDetails,
  type PharmacyOption,
} from "@/components/cart/pharmacy-match-details";
import { checkoutErrorMessage } from "@/lib/checkout-errors";
import {
  scorePharmacies,
  roadDistanceKm,
  type ListingsMap,
  type ListingEntry,
} from "@/lib/pharmacy-scoring";
import {
  KIGALI_DELIVERY_DISTRICTS,
  hoodsForDistrict,
  isKigaliDeliveryDistrict,
} from "@/lib/kigali-locations";
import { SearchableSelect } from "@/components/cart/searchable-select";
import { RxInsuranceBanner } from "@/components/cart/rx-insurance-banner";

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
    supportedInsurances: (p.accepted_insurances ?? []).map((ins) => ins.name),
    isOpen: p.is_open,
    imageUrl: p.image_url ?? p.logo_url ?? "",
    province: "Kigali",
    district: p.district,
    sellerKind: p.sellerKind ?? "pharmacy",
  };
}

/**
 * Distance-based delivery fee in RWF.
 *   ≤10 km          → 1,500
 *   >10 km, ≤15 km  → 2,000
 *   >15 km, ≤20 km  → 2,500
 *   >20 km          → 2,500 + 150 × ceiling(extra km)
 */
function calcDeliveryFee(roadKm: number): number {
  if (roadKm <= 10) return 1_500;
  if (roadKm <= 15) return 2_000;
  if (roadKm <= 20) return 2_500;
  return 2_500 + Math.ceil(roadKm - 20) * 150;
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
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const t = useTranslation();
  const searchParams = useSearchParams();
  const rxId = searchParams.get("rx"); // present when coming from a prescription
  const isLocked = !!rxId;             // prescription cart — items are read-only

  const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "cart",      label: t.cart_step_cart,      icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: "pharmacy",  label: t.cart_step_pharmacy,  icon: <Brain className="w-3.5 h-3.5" /> },
    { key: "details",   label: t.cart_step_details,   icon: <MapPin className="w-3.5 h-3.5" /> },
    { key: "payment",   label: t.cart_step_pay_short, icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: "confirmed", label: t.cart_step_done,      icon: <Package className="w-3.5 h-3.5" /> },
  ];

  const [step, setStep]                       = useState<Step>("cart");
  const [selectedOption, setSelectedOption]   = useState<PharmacyOption | null>(null);
  const [fulfillment, setFulfillment]         = useState<"delivery" | "pickup">("delivery");
  const [patientDistrict, setPatientDistrict] = useState("");
  const [patientLocation, setPatientLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus]     = useState<"idle" | "pending" | "granted" | "denied" | "unsupported">("idle");
  const [name, setName]                       = useState("");
  const [phone, setPhone]                     = useState("");
  const [district, setDistrict]               = useState("");
  const [deliveryHood, setDeliveryHood]       = useState("");
  const [notes, setNotes]                     = useState("");
  const [deferDeliveryFee, setDeferDeliveryFee] = useState(false);
  const [accessCode, setAccessCode]           = useState("");
  const [isPlacingOrder, setIsPlacingOrder]   = useState(false);
  const [paymentStepLabel, setPaymentStepLabel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mtn_momo" | "airtel_money" | "card">("mtn_momo");
  const PAYMENT_FEE_PCT = 3.5;
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string>("");
  const [pharmacyList, setPharmacyList]       = useState<Pharmacy[]>([]);
  const [listingsMap, setListingsMap]         = useState<ListingsMap>(new Map());
  const [listingsLoading, setListingsLoading] = useState(false);
  const [aiPhase, setAiPhase]               = useState(0);   // 0=idle, 1-4=phases, 5=done
  const [pharmaReady, setPharmaReady]       = useState(false);
  const [detailsOption, setDetailsOption]   = useState<PharmacyOption | null>(null);
  // ── Prescription-locked mode state ──────────────────────────
  const [rxData, setRxData]       = useState<BackendPrescription | null>(null);
  const [rxLoading, setRxLoading] = useState(false);
  /** Catalogue product data for each prescription item that has a linked product_id */
  const [rxProductsMap, setRxProductsMap] = useState<Map<string, Medicine>>(new Map());
  const detailsPrefilledRef = useRef(false);

  // Pre-fill checkout details from the signed-in patient's profile (editable).
  useEffect(() => {
    if (step !== "details" || detailsPrefilledRef.current) return;

    if (isGuest) {
      detailsPrefilledRef.current = true;
      return;
    }

    // Wait until auth profile is loaded before pre-filling.
    if (!user) return;

    detailsPrefilledRef.current = true;

    const profileName = user.name;
    const profilePhone = user.phone;
    if (profileName) setName((v) => v || profileName);
    if (profilePhone) setPhone((v) => v || profilePhone);

    patientsService
      .listAddresses()
      .then((addresses) => {
        const defaultAddr =
          addresses.find((a) => a.is_default) ?? addresses[0];
        if (!defaultAddr) return;
        const addrDistrict = defaultAddr.district;
        const addrNotes = defaultAddr.line2;
        if (addrDistrict) setDistrict((v) => v || addrDistrict);
        if (addrNotes) setNotes((v) => v || addrNotes);
      })
      .catch(() => {});
  }, [step, user, isGuest]);

  // Return from Pesapal hosted checkout
  useEffect(() => {
    const paymentReturn = searchParams.get("payment_return");
    const orderId = searchParams.get("order_id");
    if (paymentReturn !== "1" || !orderId || isGuest) return;

    let cancelled = false;
    (async () => {
      setIsPlacingOrder(true);
      setPaymentStepLabel(t.cart_momo_wait);
      setStep("payment");
      try {
        await paymentsService.waitUntilPaid(orderId);
        if (cancelled) return;
        const code =
          sessionStorage.getItem(`pending_order_code_${orderId}`) ?? orderId;
        setConfirmedOrderCode(code);
        if (!isLocked) clear();
        setStep("confirmed");
        window.history.replaceState({}, "", "/cart");
      } catch (err) {
        if (!cancelled) {
          toast.error(checkoutErrorMessage(err, t.cart_checkout_error));
        }
      } finally {
        if (!cancelled) {
          setIsPlacingOrder(false);
          setPaymentStepLabel("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, isGuest, isLocked, clear, t]);

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
        category: t.cart_rx_category,
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
    if (step === "confirmed") return;
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

  const requestPatientLocation = () => {
    if (!navigator?.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPatientLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 12_000, maximumAge: 60_000, enableHighAccuracy: true },
    );
  };

  // Request GPS when entering pharmacy/details for delivery, or pharmacy step for proximity
  useEffect(() => {
    if (patientLocation) {
      setLocationStatus("granted");
      return;
    }
    const needsGps =
      step === "pharmacy" ||
      (fulfillment === "delivery" && (step === "details" || step === "payment"));
    if (needsGps && locationStatus === "idle") {
      requestPatientLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, fulfillment, patientLocation, locationStatus]);

  // Auto-switch to pickup when the selected pharmacy is more than 20 km away
  // (road distance = haversine × 1.3). The backend enforces this too, but we
  // proactively disable delivery in the UI so the patient isn't surprised.
  useEffect(() => {
    const roadDist = patientLocation && selectedOption && selectedOption.distanceKm > 0
      ? roadDistanceKm(selectedOption.distanceKm)
      : 0;
    if (roadDist > 20 && fulfillment === "delivery") {
      setFulfillment("pickup");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, patientLocation]);

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
  const hasPartialLines = partialLines.length > 0;
  const hasPackLines    = packLines.length > 0;

  // Subtotal: correct price for each line's sell mode.
  // For partial lines: use unitPriceFrom (per-unit). If the catalogue has no unit price
  // yet, we show 0 for that line so it's never confused with the pack price.
  const subtotalPack = packLines.reduce(
    (s, e) => s + (e.medicine.price) * e.qty, 0,
  );
  const subtotalPackMax = packLines.reduce(
    (s, e) => s + (e.medicine.maxPrice ?? e.medicine.price) * e.qty, 0,
  );
  const subtotalPartial = partialLines.reduce((s, e) => {
    const range = lineUnitPriceRange(e.medicine, e.sellMode, listingsMap);
    const unitMin = range?.min ?? e.medicine.unitPriceFrom ?? 0;
    return s + unitMin * e.qty;
  }, 0);
  const subtotalPartialMax = partialLines.reduce((s, e) => {
    const range = lineUnitPriceRange(e.medicine, e.sellMode, listingsMap);
    const unitMax = range?.max ?? e.medicine.unitPriceFrom ?? 0;
    return s + unitMax * e.qty;
  }, 0);
  // Combined catalogue-level subtotal (used for delivery fee threshold and display)
  const subtotal = subtotalPack + subtotalPartial;
  const subtotalMax = subtotalPackMax + subtotalPartialMax;
  const hasPartialPriceRange =
    hasPartialLines && subtotalPartial > 0 && subtotalPartialMax > subtotalPartial;
  const hasCatalogRange =
    (hasPackLines && subtotalPackMax > subtotalPack) || hasPartialPriceRange;

  // Road-distance estimate
  const selectedRoadDistKm =
    patientLocation && selectedOption && selectedOption.distanceKm > 0
      ? roadDistanceKm(selectedOption.distanceKm)
      : 0;
  const deliveryTooFar = selectedRoadDistKm > 20;

  // Distance-based fee when GPS is available; fall back to subtotal threshold otherwise.
  const deliveryHoodOptions = hoodsForDistrict(district);
  const deliveryLocationReady =
    fulfillment !== "delivery" || patientLocation !== null;
  const deliveryFeeKnown =
    fulfillment === "pickup" || patientLocation !== null;
  const deliveryFee =
    fulfillment === "pickup"
      ? 0
      : !patientLocation
        ? null
        : selectedRoadDistKm > 0
          ? calcDeliveryFee(selectedRoadDistKm)
          : 1500;
  const deliveryFeeAmount = deliveryFee ?? 0;
  const hasPositiveDeliveryFee = deliveryFeeAmount > 0;
  const medicineFullSubtotal = selectedOption?.priceEstimate ?? subtotal;
  // Insurance discount only when the selected pharmacy accepts the Rx insurance
  const rxInsuranceDiscount =
    isLocked &&
    rxData?.insurance_discount_pct &&
    selectedOption?.insuranceMatch &&
    medicineFullSubtotal > 0
      ? selectedOption.insuranceSaving
      : 0;
  const medicineSubtotal = medicineFullSubtotal - rxInsuranceDiscount;
  const total        = medicineFullSubtotal + deliveryFeeAmount - rxInsuranceDiscount;
  // If patient defers the delivery fee, only medicines + insurance savings are due now
  const amountDueNow = total - (deferDeliveryFee && hasPositiveDeliveryFee ? deliveryFeeAmount : 0);
  const stepIdx      = STEPS.findIndex((s) => s.key === step);

  const rxInsuranceProvider =
    isLocked && rxData?.insurance_provider && rxData.insurance_discount_pct
      ? rxData.insurance_provider
      : null;
  const rxInsuranceDiscountPct =
    isLocked && rxData?.insurance_discount_pct ? rxData.insurance_discount_pct : null;
  const showRxInsurance =
    Boolean(rxInsuranceProvider && rxInsuranceDiscountPct);

  const pharmacyOptions = useMemo(
    () => scorePharmacies(
      enriched,
      pharmacyList,
      listingsMap,
      patientDistrict,
      patientLocation,
      rxInsuranceProvider,
      rxInsuranceDiscountPct,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched.map((e: CartEntry) => `${e.medicine.id}:${e.sellMode}:${e.qty}`).join(","), pharmacyList, listingsMap, fulfillment, patientDistrict, patientLocation, rxInsuranceProvider, rxInsuranceDiscountPct]
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
          aria-label={isLocked ? t.cart_back_rx : t.cart_back_store}
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.cart_title}</h1>
          <p className="text-slate-500 text-sm">
            {isLocked
              ? `${rxData?.items.length ?? "—"} item${(rxData?.items.length ?? 0) !== 1 ? "s" : ""} · Pharmacist prepared`
              : t.cart_items_count.replace("{n}", String(enriched.length))}
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
          {showRxInsurance && rxInsuranceProvider && rxInsuranceDiscountPct != null && (
            <RxInsuranceBanner
              provider={rxInsuranceProvider}
              discountPct={rxInsuranceDiscountPct}
            />
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
          const unitRange = lineUnitPriceRange(medicine, sellMode, listingsMap);
          const rxItem = isLocked ? (rxData?.items[idx] ?? null) : null;
          const pharmacistNotes = rxItem ? decodeInstructions(rxItem.instructions) : null;
          const hasProductLink = Boolean(medicine.id) && !medicine.id.startsWith("rx-");
          return (
            <div key={lineKey} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
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
                  {sellMode === "partial" ? `${t.cart_partial} · per ${unitLabel}` : t.cart_whole_pack}
                </p>
                {sellMode === "partial" && !unitRange ? (
                  <p className="text-xs text-slate-400 italic mt-1.5">Price set at pharmacy</p>
                ) : unitRange && unitRange.min !== unitRange.max ? (
                  <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">
                    {formatPrice(unitRange.min)} – {formatPrice(unitRange.max)}
                    <span className="text-xs font-medium text-slate-500"> / {unitLabel}</span>
                  </p>
                ) : unitRange || linePrice > 0 ? (
                  <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">
                    {formatPrice(unitRange?.min ?? linePrice)}
                    <span className="text-xs font-medium text-slate-500"> / {unitLabel}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-1.5">Price set at pharmacy</p>
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
                    {sellMode === "partial" ? t.cart_partial : t.cart_whole_pack}
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1">×{qty}</p>
                </div>
              ) : (
                /* Normal mode — remove + qty controls */
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
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
            const lineTotal = lineTotalPriceRange(medicine, sellMode, qty, listingsMap);
            const unitLabel = sellMode === "partial"
              ? (medicine.partialUnitName ?? "unit")
              : "pack";
            return (
              <div key={cartLineKey(medicine.id, sellMode)} className="flex justify-between text-slate-600 gap-2">
                <span className="truncate max-w-[60%]">
                  {medicine.name}
                  <span className="text-slate-400 text-xs ml-1">
                    ×{qty} {unitLabel}
                  </span>
                </span>
                {!lineTotal ? (
                  <span className="text-slate-400 text-xs italic shrink-0">At pharmacy</span>
                ) : lineTotal.min !== lineTotal.max ? (
                  <span className="font-medium shrink-0">{formatPrice(lineTotal.min)} – {formatPrice(lineTotal.max)}</span>
                ) : (
                  <span className="font-medium shrink-0">{formatPrice(lineTotal.min)}</span>
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
              {t.cart_prices_note}
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
          {t.cart_find_pharmacy}
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
          aria-label={t.cart_edit_cart}
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Choose Your Pharmacy</h1>
          <p className="text-slate-500 text-sm">AI-ranked by: stock · price · distance · expiry</p>
        </div>
      </div>

      <StepBar />

      {/* Fulfillment mode toggle — affects AI ranking and pricing */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {(["delivery", "pickup"] as const).map((mode) => {
          const isDelivery = mode === "delivery";
          const disabled   = isDelivery && deliveryTooFar;
          return (
            <button
              key={mode}
              onClick={() => !disabled && setFulfillment(mode)}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all",
                disabled
                  ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                  : fulfillment === mode
                  ? "border-farumasi-500 bg-farumasi-50 text-farumasi-700"
                  : "border-slate-100 bg-white text-slate-500 hover:border-farumasi-200"
              )}
            >
              {isDelivery
                ? <><Truck className="w-4 h-4" /> {t.cart_fulfillment_delivery}</>
                : <><Building2 className="w-4 h-4" /> {t.cart_fulfillment_pickup}</>}
            </button>
          );
        })}
      </div>

      {/* Distance restriction warning — shown when selected pharmacy is >20 km away */}
      {deliveryTooFar && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-amber-800">
            {t.cart_delivery_too_far}
          </p>
        </div>
      )}

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
            <option value="">{t.cart_select_district}</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}

      {fulfillment === "delivery" && !deliveryLocationReady && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900">Location access required</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {locationStatus === "denied"
                ? "Allow location in your browser settings, then tap Enable location."
                : locationStatus === "unsupported"
                  ? "GPS is not available in this browser — choose pickup or use the mobile app."
                  : "Enable location to calculate delivery fee. We never show delivery as free without GPS."}
            </p>
            {locationStatus !== "unsupported" && (
              <button
                type="button"
                onClick={requestPatientLocation}
                disabled={locationStatus === "pending"}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-200 rounded-xl px-3 py-1.5 hover:bg-amber-100 disabled:opacity-60"
              >
                <Navigation className="w-3.5 h-3.5" />
                {locationStatus === "pending" ? "Detecting location…" : "Enable location"}
              </button>
            )}
          </div>
        </div>
      )}

      {showRxInsurance && rxInsuranceProvider && rxInsuranceDiscountPct != null && (
        <RxInsuranceBanner
          provider={rxInsuranceProvider}
          discountPct={rxInsuranceDiscountPct}
          pharmacyMatch={selectedOption?.insuranceMatch ?? null}
          className="mb-4"
        />
      )}

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          <span className="font-semibold">{t.cart_names_hidden}</span> {t.cart_names_hidden_sub}
        </p>
      </div>

      {/* Pharmacy option cards — AI analysis / empty / results */}
      {!pharmaReady ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
          {/* Simple loading spinner for prescription mode; full AI animation for normal mode */}
          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-farumasi-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">{t.cart_rx_finding}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-farumasi-600 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.cart_ai_title}</p>
                  <p className="text-xs text-slate-400">{t.cart_ai_finding}</p>
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
                    label: `${t.cart_ai_phase1} (${pharmacyList.length || "—"})`,
                    sub: t.cart_ai_phase1_sub,
                  },
                  {
                    label: t.cart_ai_phase2,
                    sub: enriched.length > 0
                      ? enriched.slice(0, 2).map((e: CartEntry) => e.medicine.name).join(", ") +
                        (enriched.length > 2 ? ` +${enriched.length - 2} more` : "")
                      : t.cart_ai_phase2_items,
                  },
                  {
                    label: t.cart_ai_phase3,
                    sub: patientLocation ? t.cart_ai_phase3_gps : t.cart_ai_phase3_district,
                  },
                  {
                    label: t.cart_ai_phase4,
                    sub: t.cart_ai_phase4_sub,
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
          <h3 className="font-bold text-slate-800 mb-1">{t.cart_no_match}</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            {t.cart_no_match_sub}
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded-2xl px-4 py-3 text-left space-y-1.5 mb-4">
            <p className="font-semibold text-slate-600 mb-1.5">{t.cart_no_match_tip_title}</p>
            <p>• {t.cart_no_match_tip1}</p>
            <p>• {t.cart_no_match_tip2}</p>
            <p>• {t.cart_no_match_tip3}</p>
          </div>
          <button
            onClick={() => setStep("cart")}
            className="text-sm font-semibold text-farumasi-600 hover:underline"
          >
            ← {isLocked ? t.cart_back_rx : t.cart_edit_cart}
          </button>
        </div>
      ) : (
      <div className="space-y-3 mb-6">
        {pharmacyOptions.map((opt) => {
          const isSelected  = selectedOption?.codename === opt.codename;
          const isBest      = opt.rank === 1;
          const rank1       = pharmacyOptions[0];
          // Only award secondary badges when the card is STRICTLY better than #1 on that axis
          const isBestValue =
            !isBest &&
            opt.comparesOnFullStockPrice &&
            rank1.comparesOnFullStockPrice &&
            opt.fullStockPriceRank > 0 &&
            rank1.fullStockPriceRank > 0 &&
            opt.fullStockPriceRank < rank1.fullStockPriceRank;
          const cardRoadDistKm = opt.roadDistanceKm > 0 ? opt.roadDistanceKm : 0;
          const cardDeliveryBlocked = fulfillment === "delivery" && cardRoadDistKm > 20;
          const cardDeliveryFee =
            fulfillment === "pickup" ? 0
            : cardDeliveryBlocked ? 0
            : !patientLocation ? null
            : cardRoadDistKm > 0 ? calcDeliveryFee(cardRoadDistKm)
            : 1500;
          const cardMedicineDue = opt.priceAfterInsurance;
          const cardTotal = cardMedicineDue + (cardDeliveryFee ?? 0);

          return (
            <div
              key={opt.codename}
              className={cn(
                "w-full rounded-3xl border-2 transition-all overflow-hidden",
                isSelected
                  ? "border-farumasi-500 bg-farumasi-50 shadow-md"
                  : "border-slate-100 bg-white hover:border-farumasi-200 hover:shadow-sm"
              )}
            >
            <button
              type="button"
              onClick={() => setSelectedOption(opt)}
              className="w-full text-left p-4"
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
                  style={{ width: `${Math.min(100, opt.matchPercent)}%` }}
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
                        {t.cart_pharmacy_label} {opt.codename}
                      </span>
                      {isBest && (
                        <span className="text-[10px] font-bold bg-farumasi-600 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> {t.cart_best_match}
                        </span>
                      )}
                      {isBestValue && (
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CreditCard className="w-2.5 h-2.5" /> {t.cart_best_value}
                        </span>
                      )}
                      {!isBest && (
                        <span className="text-[10px] text-slate-400 tabular-nums font-medium">
                          {opt.matchPercent}% match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {opt.insuranceMatch && rxInsuranceProvider && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          <Shield className="w-2.5 h-2.5" /> Accepts {rxInsuranceProvider}
                        </span>
                      )}
                      {!opt.insuranceMatch && opt.rxHasInsurance && rxInsuranceProvider && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                          <Shield className="w-2.5 h-2.5" /> Full price
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {opt.pharmacy.district}
                        {cardRoadDistKm > 0 && ` \u00b7 ~${cardRoadDistKm.toFixed(1)} km est. road`}
                      </span>
                    </div>
                    {/* AI insight — rank 1 only */}
                    {isBest && (() => {
                      const why: string[] = [];
                      if (opt.availableCount === opt.totalCount) why.push(t.cart_full_stock);
                      else why.push(`${opt.availableCount}/${opt.totalCount} items available`);
                      if (opt.insuranceMatch && rxInsuranceProvider) {
                        why.push(`Accepts ${rxInsuranceProvider}`);
                      }
                      const isNearest = opt.distanceKm > 0 &&
                        pharmacyOptions.every(o => o === opt || o.distanceKm === 0 || o.distanceKm >= opt.distanceKm);
                      if (isNearest) why.push(t.cart_nearest);
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
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Pill className="w-3.5 h-3.5 text-farumasi-500" />
                  <span className="font-semibold">{opt.availableCount}/{opt.totalCount}</span>
                  <span className="text-slate-400">medicines</span>
                </div>
                {cardRoadDistKm > 0 && (
                  <div className="flex items-center gap-1 text-xs text-farumasi-600">
                    <Navigation className="w-3.5 h-3.5" />
                    <span className="font-medium">~{cardRoadDistKm.toFixed(1)} km est. road</span>
                  </div>
                )}
                {opt.distanceRank > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>#{opt.distanceRank} nearest</span>
                  </div>
                )}
              </div>
              {/* Pricing summary — delivery fee shown clearly */}
              <div className="mt-2.5 rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-white px-3 py-2 text-xs">
                  <span className="text-slate-600">Medicine subtotal</span>
                  <span className={cn(
                    "font-semibold",
                    opt.insuranceMatch ? "text-slate-500 line-through text-[11px]" : "text-slate-800",
                  )}>
                    {formatPrice(opt.priceEstimate)}
                  </span>
                </div>
                {opt.insuranceMatch && opt.insuranceSaving > 0 && rxInsuranceProvider && (
                  <div className="flex items-center justify-between bg-green-50 px-3 py-2 text-xs border-t border-slate-100">
                    <span className="text-green-800 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {rxInsuranceProvider} ({rxInsuranceDiscountPct}% off)
                    </span>
                    <span className="font-bold text-green-800">−{formatPrice(opt.insuranceSaving)}</span>
                  </div>
                )}
                {opt.insuranceMatch && (
                  <div className="flex items-center justify-between bg-white px-3 py-2 text-xs border-t border-slate-100">
                    <span className="text-slate-600 font-medium">You pay (medicines)</span>
                    <span className="font-bold text-farumasi-700">{formatPrice(cardMedicineDue)}</span>
                  </div>
                )}
                {fulfillment === "delivery" && (
                  <div className={cn(
                    "flex items-center justify-between px-3 py-2 text-xs border-t border-slate-100",
                    cardDeliveryBlocked ? "bg-amber-50" : "bg-violet-50",
                  )}>
                    <span className={cn("flex items-center gap-1 font-medium", cardDeliveryBlocked ? "text-amber-800" : "text-violet-800")}>
                      <Truck className="w-3.5 h-3.5" />
                      Delivery fee
                      {cardRoadDistKm > 0 && ` (~${cardRoadDistKm.toFixed(1)} km)`}
                    </span>
                    <span className={cn("font-bold", cardDeliveryBlocked ? "text-amber-800" : "text-violet-900")}>
                      {cardDeliveryBlocked
                        ? "Pickup only"
                        : cardDeliveryFee == null
                          ? "Enable location"
                          : cardDeliveryFee > 0
                            ? formatPrice(cardDeliveryFee)
                            : "Free"}
                    </span>
                  </div>
                )}
                {fulfillment === "pickup" && (
                  <div className="flex items-center justify-between bg-green-50 px-3 py-2 text-xs border-t border-slate-100">
                    <span className="text-green-800 font-medium">Pickup</span>
                    <span className="font-bold text-green-800">No delivery fee</span>
                  </div>
                )}
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Estimated total</span>
                  <span className="text-sm font-extrabold text-farumasi-700">
                    {cardDeliveryBlocked && fulfillment === "delivery"
                      ? "—"
                      : cardDeliveryFee == null
                        ? "—"
                        : formatPrice(cardTotal)}
                  </span>
                </div>
              </div>
            </button>
            <div className="px-4 pb-3 pt-0">
              <button
                type="button"
                onClick={() => setDetailsOption(opt)}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-farumasi-700 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                {t.cart_view_details}
              </button>
            </div>
            </div>
          );
        })}
      </div>
      )} {/* end listingsLoading / pharmacyOptions ternary */}

      <PharmacyMatchDetails
        option={detailsOption}
        allOptions={pharmacyOptions}
        fulfillment={fulfillment}
        patientLocation={patientLocation}
        patientDistrict={patientDistrict}
        rxInsuranceProvider={rxInsuranceProvider}
        rxInsuranceDiscountPct={rxInsuranceDiscountPct}
        deliveryFee={
          fulfillment === "delivery" && detailsOption
            ? (detailsOption.roadDistanceKm > 0
                ? calcDeliveryFee(detailsOption.roadDistanceKm)
                : detailsOption.priceEstimate >= 10000 ? 0 : 1500)
            : 0
        }
        onClose={() => setDetailsOption(null)}
      />

      <button
        disabled={!selectedOption || !pharmaReady || (fulfillment === "delivery" && !deliveryLocationReady)}
        onClick={() => setStep("details")}
        className={cn(
          "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5 flex items-center justify-center gap-1",
          selectedOption && pharmaReady
            ? "bg-farumasi-600 hover:bg-farumasi-700"
            : "bg-slate-200 cursor-not-allowed text-slate-400"
        )}
      >
        {selectedOption ? `${t.cart_continue_pharmacy} ${selectedOption.codename}` : t.cart_continue_pharmacy_empty}
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
      (!needsAddress || (!!district && !!deliveryHood && isKigaliDeliveryDistrict(district) && deliveryLocationReady));

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
            {fulfillment === "pickup" ? t.cart_pickup_details : t.cart_delivery_details}
          </h1>
            <p className="text-slate-500 text-sm">{t.cart_details_subtitle}</p>
          </div>
        </div>

        <StepBar />

        {showRxInsurance && rxInsuranceProvider && rxInsuranceDiscountPct != null && (
          <RxInsuranceBanner
            provider={rxInsuranceProvider}
            discountPct={rxInsuranceDiscountPct}
            pharmacyMatch={selectedOption?.insuranceMatch ?? null}
            className="mb-5"
          />
        )}

        {fulfillment === "delivery" && !deliveryLocationReady && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
            <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">Enable location to continue</p>
              <p className="text-xs text-amber-800 mt-0.5">Delivery requires GPS for accurate fees.</p>
              <button
                type="button"
                onClick={requestPatientLocation}
                className="mt-2 text-xs font-bold text-amber-900 underline"
              >
                Enable location
              </button>
            </div>
          </div>
        )}

        {/* Pickup info — reminder of chosen mode */}
        {fulfillment === "pickup" && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
            <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              {t.cart_pickup_banner}
            </p>
          </div>
        )}

        {/* Contact details — required for both pickup and delivery */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 mb-5">
          <h3 className="text-sm font-bold text-slate-700">{t.cart_contact_details}</h3>

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
            <h3 className="text-sm font-bold text-slate-700">{t.cart_delivery_address}</h3>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                {t.cart_district} <span className="text-red-400">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setDeliveryHood("");
                }}
                className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all bg-white"
              >
                <option value="">{t.cart_select_district}</option>
                {KIGALI_DELIVERY_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Delivery is available within Kigali City only (Gasabo, Nyarugenge, Kicukiro).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Neighbourhood / sector <span className="text-red-400">*</span>
              </label>
              <SearchableSelect
                value={deliveryHood}
                onChange={setDeliveryHood}
                options={deliveryHoodOptions}
                placeholder={district ? "Search or type your area…" : "Select district first"}
                disabled={!district}
                allowCustom
                emptyLabel="Type your neighbourhood above, then tap Use"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Can&apos;t find your area? Type it and choose &ldquo;Use …&rdquo; to add it.
              </p>
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

        {/* Access code — patient chooses their own verification code */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700">{t.cart_access_title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {fulfillment === "pickup"
                ? t.cart_access_pickup
                : t.cart_access_delivery}
              {" "}{t.cart_access_min}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              {t.cart_access_label} <span className="text-red-400">*</span>
            </label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Type your own code (e.g. LION2025)"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full h-12 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-base text-slate-900 font-bold tracking-widest outline-none focus:border-farumasi-500 focus:ring-2 focus:ring-farumasi-100 transition-all"
            />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This is not generated for you. Pick something you will remember and can tell the{" "}
              {fulfillment === "pickup" ? "pharmacist" : "rider"}.
            </p>
          </div>
        </div>

        {/* Order estimate */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">{t.cart_summary}</h3>
          <div className="space-y-2 text-sm">
            {enriched.map(({ medicine, qty, sellMode }) => {
              const lineTotal = lineTotalPriceRange(medicine, sellMode, qty, listingsMap);
              const unitLabel = sellMode === "partial"
                ? (medicine.partialUnitName ?? "unit")
                : "pack";
              return (
                <div key={cartLineKey(medicine.id, sellMode)} className="flex justify-between text-slate-600 gap-2">
                  <span className="truncate max-w-[58%]">
                    {medicine.name}
                    <span className="text-slate-400 text-xs ml-1">×{qty} {unitLabel}</span>
                  </span>
                  {!lineTotal ? (
                    <span className="text-slate-400 text-xs italic shrink-0">At pharmacy</span>
                  ) : lineTotal.min !== lineTotal.max ? (
                    <span className="font-medium shrink-0">{formatPrice(lineTotal.min)} – {formatPrice(lineTotal.max)}</span>
                  ) : (
                    <span className="font-medium shrink-0">{formatPrice(lineTotal.min)}</span>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between border-t border-dashed border-slate-100 pt-2 font-semibold text-slate-800">
              <span>{t.cart_subtotal}</span>
              <span>
                {selectedOption
                  ? formatPrice(selectedOption.priceEstimate)
                  : hasCatalogRange
                    ? `${formatPrice(subtotal)} – ${formatPrice(subtotalMax)}`
                    : formatPrice(subtotal)}
              </span>
            </div>
            {rxInsuranceDiscount > 0 && rxInsuranceProvider && (
              <div className="flex justify-between text-green-600 text-sm">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  {rxInsuranceProvider} ({rxInsuranceDiscountPct}% off)
                </span>
                <span className="font-bold">−{formatPrice(rxInsuranceDiscount)}</span>
              </div>
            )}
            {(selectedOption || rxInsuranceDiscount > 0) && (
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2">
                <span>Medicines due</span>
                <span className="text-farumasi-700">{formatPrice(medicineSubtotal)}</span>
              </div>
            )}
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
    const canPlace   = !!selectedOption && deliveryLocationReady &&
      (paymentMethod === "card" ? true : phone.trim().length >= 9);
    const orderSubtotal = Math.round(
      amountDueNow > 0 ? amountDueNow : medicineSubtotal + (deferDeliveryFee ? 0 : deliveryFeeAmount),
    );
    const processingFee = orderSubtotal > 0 ? Math.round(orderSubtotal * PAYMENT_FEE_PCT / 100) : 0;
    const totalWithFee = orderSubtotal + processingFee;

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
            <p className="text-slate-500 text-sm">{t.cart_payment_subtitle}</p>
          </div>
        </div>

        <StepBar />

        {showRxInsurance && rxInsuranceProvider && rxInsuranceDiscountPct != null && (
          <RxInsuranceBanner
            provider={rxInsuranceProvider}
            discountPct={rxInsuranceDiscountPct}
            pharmacyMatch={selectedOption?.insuranceMatch ?? null}
            className="mb-5"
          />
        )}

        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 px-4 py-3 mb-5 flex items-start gap-3">
          <ExternalLink className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-relaxed">
            Secure checkout opens on Pesapal. Complete payment with your chosen method below.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">How would you like to pay?</p>
          <div className="space-y-2">
            {([
              {
                id: "mtn_momo" as const,
                label: "MTN MoMo",
                hint: "Pay with MTN Mobile Money",
                accent: "border-l-amber-400",
                iconBg: "bg-amber-100",
                iconColor: "text-amber-700",
              },
              {
                id: "airtel_money" as const,
                label: "Airtel Money",
                hint: "Pay with Airtel Money",
                accent: "border-l-red-500",
                iconBg: "bg-red-50",
                iconColor: "text-red-600",
              },
              {
                id: "card" as const,
                label: "Card",
                hint: "Visa or Mastercard via Pesapal",
                accent: "border-l-blue-500",
                iconBg: "bg-blue-50",
                iconColor: "text-blue-600",
              },
            ]).map((m) => {
              const selected = paymentMethod === m.id;
              return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={cn(
                  "w-full text-left rounded-2xl border-2 border-l-4 px-4 py-3.5 transition-all",
                  m.accent,
                  selected
                    ? "border-farumasi-500 bg-farumasi-50 shadow-sm ring-1 ring-farumasi-200"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", m.iconBg)}>
                    <CreditCard className={cn("w-5 h-5", m.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{m.label}</p>
                    <p className="text-xs text-slate-500">{m.hint}</p>
                  </div>
                  {selected ? (
                    <CheckCircle2 className="w-5 h-5 text-farumasi-600 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                </div>
              </button>
            );
            })}
          </div>
        </div>

        {paymentMethod !== "card" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
            {paymentMethod === "airtel_money" ? "Airtel Money number" : t.cart_momo_number}{" "}
            <span className="text-red-400">*</span>
          </label>
          <p className="text-[11px] text-slate-500 mb-2">Used on the Pesapal checkout page.</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0781 234 567"
            type="tel"
            className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all"
          />
        </div>
        )}

        {accessCode.trim().length >= 4 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Your verification code</p>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-xs font-bold text-amber-700 hover:text-amber-900"
              >
                Change
              </button>
            </div>
            <p className="text-xl font-extrabold text-amber-950 tracking-[0.2em]">{accessCode.trim()}</p>
            <p className="text-xs text-amber-700 mt-1.5">
              {fulfillment === "pickup"
                ? "Show this at the pharmacy when you collect your order."
                : "Give this to the rider to verify and complete delivery."}
            </p>
          </div>
        )}

        {orderSubtotal > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6 text-sm">
            <p className="text-sm font-bold text-slate-800 mb-3">Payment summary</p>
            <div className="flex justify-between"><span className="text-slate-500">Order amount</span><span>{formatPrice(orderSubtotal)}</span></div>
            {processingFee > 0 && (
              <div className="flex justify-between mt-2">
                <span className="text-slate-500">Pesapal fee ({PAYMENT_FEE_PCT}%)</span>
                <span>{formatPrice(processingFee)}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">
              Includes a small Pesapal processing fee ({PAYMENT_FEE_PCT}% of the order amount).
            </p>
            <div className="flex justify-between mt-3 pt-3 border-t font-bold text-farumasi-700">
              <span>Total to pay now</span><span>{formatPrice(totalWithFee)}</span>
            </div>
          </div>
        )}

        {fulfillment === "delivery" && hasPositiveDeliveryFee && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Delivery Fee</p>
            <div className="space-y-2">
              {([
                {
                  defer: false,
                  title: t.cart_pay_now,
                  desc: `${formatPrice(deliveryFeeAmount)} charged with your medicines`,
                },
                {
                  defer: true,
                  title: t.cart_pay_after,
                  desc: t.cart_pay_after_sub,
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
            {enriched.map(({ medicine, qty, sellMode }) => {
              const lineTotal = selectedOption
                ? (() => {
                    const entry = listingsMap.get(selectedOption.pharmacy.id)?.get(medicine.id);
                    const unit = cartLineUnitPrice(medicine, sellMode, entry ?? undefined);
                    const total = unit * qty;
                    return unit > 0 ? { min: total, max: total } : null;
                  })()
                : lineTotalPriceRange(medicine, sellMode, qty, listingsMap);
              const unitLabel = sellMode === "partial"
                ? (medicine.partialUnitName ?? "unit")
                : "pack";
              return (
                <div key={cartLineKey(medicine.id, sellMode)} className="flex justify-between text-slate-600 gap-2">
                  <span className="truncate max-w-[58%]">
                    {medicine.name}
                    <span className="text-slate-400 text-xs ml-1">×{qty} {unitLabel}</span>
                  </span>
                  {!lineTotal ? (
                    <span className="text-slate-400 text-xs italic shrink-0">At pharmacy</span>
                  ) : lineTotal.min !== lineTotal.max ? (
                    <span className="font-medium shrink-0">{formatPrice(lineTotal.min)} – {formatPrice(lineTotal.max)}</span>
                  ) : (
                    <span className="font-medium shrink-0">{formatPrice(lineTotal.min)}</span>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between text-slate-600 border-t border-dashed border-slate-100 pt-2">
              <span>{t.cart_subtotal}</span>
              <span>
                {selectedOption
                  ? formatPrice(selectedOption.priceEstimate)
                  : hasCatalogRange
                    ? `${formatPrice(subtotal)} – ${formatPrice(subtotalMax)}`
                    : formatPrice(subtotal)}
              </span>
            </div>
            {fulfillment === "delivery" && (
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5 -mx-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-violet-900 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    {t.cart_delivery_fee}
                    {selectedRoadDistKm > 0 && (
                      <span className="text-violet-600 font-normal text-xs">
                        (~{selectedRoadDistKm.toFixed(1)} km est.)
                      </span>
                    )}
                  </span>
                  <span className={cn("font-bold", deliveryFee === 0 ? "text-farumasi-600" : "text-violet-900")}>
                    {deliveryFee == null
                      ? "Enable location"
                      : deliveryFee === 0
                        ? t.cart_free
                        : deferDeliveryFee
                          ? `${formatPrice(deliveryFee)} (after delivery)`
                          : formatPrice(deliveryFee)}
                  </span>
                </div>
                {deliveryFee != null && deliveryFee > 0 && !deferDeliveryFee && (
                  <p className="text-[10px] text-violet-700 mt-1">
                    Included in your total below unless you chose pay-after-delivery.
                  </p>
                )}
              </div>
            )}
            {fulfillment === "pickup" && (
              <div className="flex justify-between text-slate-600">
                <span>{t.cart_delivery_fee}</span>
                <span className="text-farumasi-600 font-bold">{t.cart_free_pickup_label}</span>
              </div>
            )}
            {showRxInsurance && rxInsuranceProvider && !selectedOption?.insuranceMatch && (
              <div className="flex justify-between text-amber-700 text-xs">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Full price — pharmacy does not accept {rxInsuranceProvider}
                </span>
              </div>
            )}
            {rxInsuranceDiscount > 0 && rxInsuranceProvider && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{rxInsuranceProvider} ({rxInsuranceDiscountPct}% off)</span>
                </span>
                <span className="font-bold">−{formatPrice(rxInsuranceDiscount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between">
              <span className="font-bold text-slate-900">{deferDeliveryFee && hasPositiveDeliveryFee ? t.cart_due_now : t.cart_total}</span>
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
            if (isGuest) {
              toast.error("Please sign in to place an order.");
              return;
            }
            if (
              fulfillment === "delivery" &&
              (!district || !deliveryHood || !isKigaliDeliveryDistrict(district) || !patientLocation)
            ) {
              toast.error(
                patientLocation
                  ? "Choose a Kigali district and neighbourhood for delivery."
                  : "Enable location access to calculate delivery and place your order.",
              );
              return;
            }
            setIsPlacingOrder(true);
            setPaymentStepLabel(t.cart_creating);
            try {
              const deliveryAddr = fulfillment === "delivery"
                ? [deliveryHood, district, "Kigali"].filter(Boolean).join(", ")
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

              const missingListings = orderItems.filter((it) => !("product_listing_id" in it) || !it.product_listing_id);
              if (missingListings.length > 0) {
                toast.error(
                  "Some items are missing pharmacy stock links. Go back and re-select a pharmacy, or refresh the page.",
                );
                return;
              }
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

              const redirectUrl = `${window.location.origin}/cart?payment_return=1&order_id=${orderId}`;
              setPaymentStepLabel(t.cart_momo_start);
              const init = await paymentsService.initiatePesapal(orderId, {
                phone: phone.trim() || undefined,
                name: name.trim() || undefined,
                redirect_url: redirectUrl,
                payment_method: paymentMethod,
              });

              if (init.checkout_url) {
                sessionStorage.setItem(`pending_order_code_${orderId}`, orderCode);
                window.location.href = init.checkout_url;
                return;
              }

              if (init.payment_status !== "paid") {
                setPaymentStepLabel(t.cart_momo_wait);
                await paymentsService.waitUntilPaid(orderId);
              }

              setConfirmedOrderCode(orderCode);
              if (!isLocked) clear();
              setStep("confirmed");
            } catch (err) {
              toast.error(checkoutErrorMessage(err, t.cart_checkout_error));
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
            ? paymentStepLabel || t.cart_processing
            : `${t.cart_place_order} · ${formatPrice(amountDueNow)}`}
        </button>
        {isPlacingOrder && amountDueNow > 0 && (
          <p className="text-center text-xs text-slate-500 mt-2">
            {paymentStepLabel || "Complete payment on Pesapal to continue."}
          </p>
        )}
      </div>
    );
  }

  // ── STEP 5: Confirmed ─────────────────────────────────────────
  if (step === "confirmed" && fulfillment === "pickup") {
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
              <p className="text-xs font-bold text-amber-700">{t.cart_your_access}</p>
              <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{accessCode}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t.cart_access_pickup}</p>
            </div>
          </div>
        )}

        {/* Pharmacy reveal */}
        {selectedOption && (
          <div className="w-full bg-gradient-to-br from-farumasi-600 to-farumasi-700 rounded-3xl p-5 mb-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 opacity-70" />
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t.cart_your_pharmacy}</p>
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

  if (step === "confirmed" && fulfillment === "delivery") {
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
            <p className="text-xs font-bold text-amber-700">{t.cart_your_access}</p>
            <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{accessCode}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t.cart_give_rider}</p>
          </div>
        </div>
      )}

      {/* Pharmacy reveal */}
      {selectedOption && (
        <div className="w-full bg-gradient-to-br from-farumasi-600 to-farumasi-700 rounded-3xl p-5 mb-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 opacity-70" />
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t.cart_your_pharmacy}</p>
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
                {fulfillment === "delivery"
                  ? selectedRoadDistKm > 0
                    ? `Delivery · ~${selectedRoadDistKm.toFixed(1)} km from pharmacy`
                    : "Delivery order confirmed"
                  : "Pickup at pharmacy"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-5">
        {fulfillment === "delivery" && district && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{t.cart_deliver_to}</span>
            <span className="font-bold text-slate-900 text-right max-w-[200px]">
              {[deliveryHood, district, "Kigali"].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{t.cart_payment_label}</span>
          <span className="font-bold text-slate-900">Pesapal</span>
        </div>
        {showRxInsurance && rxInsuranceProvider && (
          <div className="flex justify-between text-sm">
            <span className={cn(
              "flex items-center gap-1",
              selectedOption?.insuranceMatch ? "text-green-600" : "text-amber-700",
            )}>
              <Shield className="w-3.5 h-3.5" />
              {selectedOption?.insuranceMatch
                ? `${rxInsuranceProvider} (${rxInsuranceDiscountPct}% off)`
                : `Full price — no ${rxInsuranceProvider}`}
            </span>
            {rxInsuranceDiscount > 0 && (
              <span className="font-bold text-green-700">−{formatPrice(rxInsuranceDiscount)}</span>
            )}
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 flex justify-between">
          <span className="font-bold text-slate-900">
            {deferDeliveryFee && hasPositiveDeliveryFee ? t.cart_charged_now : t.cart_total_charged}
          </span>
          <span className="font-extrabold text-farumasi-700">{formatPrice(amountDueNow)}</span>
        </div>
        {deferDeliveryFee && hasPositiveDeliveryFee && (
          <div className="flex justify-between text-sm text-slate-500">
            <span>{t.cart_delivery_after}</span>
            <span className="font-medium">{formatPrice(deliveryFeeAmount)}</span>
          </div>
        )}
      </div>

      {/* Deferred delivery fee notice */}
      {deferDeliveryFee && hasPositiveDeliveryFee && (
        <div className="w-full flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
          <Truck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <span className="font-semibold">{t.cart_defer_banner}</span>{" "}
            {formatPrice(deliveryFeeAmount)} will be charged via Pesapal once your order is delivered.
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

  return null;
}
