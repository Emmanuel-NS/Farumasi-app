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
import { patientsService, type PatientAddress } from "@/lib/services/patients.service";
import { configService, type PublicPaymentConfig } from "@/lib/services/config.service";
import { PaymentCheckout, type PaymentMethodId } from "@/components/cart/payment-checkout";
import {
  ManualPaymentPanel,
  type ManualMomoConfig,
} from "@/components/cart/manual-payment-panel";
import {
  loadCheckoutProgress,
  saveCheckoutProgress,
  clearCheckoutProgress,
  EMPTY_MANUAL_DRAFT,
  type ManualPaymentDraft,
  type PendingManualOrder,
} from "@/lib/checkout-progress";
import { useAuthStore } from "@/store/auth-store";
import { usePatientLocation } from "@/hooks/use-patient-location";
import { usePatientLocationStore } from "@/store/patient-location-store";
import {
  assessDeliveryLocation,
  isDesktopBrowser,
  maxDeliveryAccuracyM,
  type DeliveryLocationBlockReason,
} from "@/lib/delivery-location";
import { clearPersistedGps } from "@/lib/patient-location-persist";
import {
  permissionResultMessage,
  siteSettingsHint,
} from "@/lib/permissions";

/** Shared alert surfaces — readable in light and dark mode */
const CART_ALERT_AMBER =
  "bg-amber-50 border border-amber-200 dark:bg-amber-950/55 dark:border-amber-600/70";
const CART_ALERT_AMBER_TITLE = "text-amber-900 dark:text-amber-50";
const CART_ALERT_AMBER_BODY = "text-amber-800 dark:text-amber-100/95";
const CART_ALERT_SKY =
  "bg-sky-50 border border-sky-200 dark:bg-sky-950/50 dark:border-sky-600/65";
const CART_ALERT_SKY_TITLE = "text-sky-900 dark:text-sky-50";
const CART_ALERT_SKY_BODY = "text-sky-800 dark:text-sky-100/95";
const CART_ALERT_INFO =
  "bg-slate-50 border border-slate-200 dark:bg-slate-800/95 dark:border-slate-600";
const CART_ALERT_INFO_BODY = "text-slate-600 dark:text-slate-200";
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
  type RoadDistanceMap,
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
  const hasCoords = p.latitude != null && p.longitude != null;
  return {
    id: p.id,
    name: p.name,
    locationName: p.address || p.district,
    coordinates: hasCoords ? [p.latitude!, p.longitude!] : null,
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
  const recId = searchParams.get("rec"); // pharmacy recommendation from store
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
  const [fulfillment, setFulfillment]         = useState<"delivery" | "pickup">(() =>
    typeof window !== "undefined" && isDesktopBrowser() ? "pickup" : "delivery",
  );
  const [patientDistrict, setPatientDistrict] = useState("");
  const { coordsTuple: patientLocation, status: locationStatus, requestLocation, requestLocationForDelivery, accuracy: locationAccuracy, source: locationSource, permissionBlockReason } = usePatientLocation();
  const deliveryLocationAssessment = useMemo(
    () => assessDeliveryLocation(
      patientLocation?.[0] ?? null,
      patientLocation?.[1] ?? null,
      locationAccuracy,
      locationSource,
    ),
    [patientLocation, locationAccuracy, locationSource],
  );
  const locationApproximate =
    locationSource === "gps" &&
    locationAccuracy != null &&
    locationAccuracy > 500 &&
    deliveryLocationAssessment.ok;
  const deliveryLocationBlocked = deliveryLocationAssessment.ok === false
    ? deliveryLocationAssessment.reason
    : null;
  const locationForDelivery =
    fulfillment === "delivery" && deliveryLocationAssessment.ok ? patientLocation : null;

  // Drop stale coarse fixes (e.g. 50 km desktop IP geolocation) so fees cannot use them.
  useEffect(() => {
    if (fulfillment !== "delivery") return;
    if (deliveryLocationAssessment.ok) return;
    if (locationSource !== "gps" || locationAccuracy == null) return;
    if (locationAccuracy <= maxDeliveryAccuracyM()) return;
    usePatientLocationStore.setState({
      lat: null,
      lon: null,
      accuracy: null,
      source: null,
      updatedAt: null,
      status: locationStatus === "denied" ? "denied" : "idle",
    });
    clearPersistedGps();
  }, [
    fulfillment,
    deliveryLocationAssessment.ok,
    locationSource,
    locationAccuracy,
    locationStatus,
  ]);
  const locationBlockMessage = (reason: DeliveryLocationBlockReason): string => {
    switch (reason) {
      case "outside_kigali":
        return t.cart_location_outside_kigali;
      case "desktop_unreliable":
        return t.cart_location_desktop_unreliable;
      case "low_accuracy":
        return t.cart_location_low_accuracy;
      default:
        return t.cart_location_desktop_hint;
    }
  };
  const locationPermissionHelp =
    locationStatus === "denied"
      ? `${t.perm_denied_location} ${siteSettingsHint("location")}`
      : permissionBlockReason
        ? permissionResultMessage("location", {
            state: "default",
            blockReason: permissionBlockReason,
          }, {
            perm_prompt_blocked: t.perm_prompt_blocked,
            perm_overlay_steps: t.perm_overlay_steps,
            perm_denied_location: t.perm_denied_location,
            perm_denied_notification: t.perm_denied_notification,
          })
        : null;
  const [apiDeliveryFee, setApiDeliveryFee] = useState<number | null>(null);
  const [deliveryUnavailable, setDeliveryUnavailable] = useState<string | null>(null);
  const [roadDistances, setRoadDistances] = useState<RoadDistanceMap>(new Map());
  const [roadDistancesLoading, setRoadDistancesLoading] = useState(false);
  const [name, setName]                       = useState("");
  const [phone, setPhone]                     = useState("");
  const [paymentMethod, setPaymentMethod]     = useState<PaymentMethodId>("manual_momo");
  const [district, setDistrict]               = useState("");
  const [deliveryHood, setDeliveryHood]       = useState("");
  const [notes, setNotes]                     = useState("");
  const [isPlacingOrder, setIsPlacingOrder]   = useState(false);
  const [paymentStepLabel, setPaymentStepLabel] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualPaymentDraft>(EMPTY_MANUAL_DRAFT);
  const [pendingManualOrder, setPendingManualOrder] = useState<PendingManualOrder | null>(null);
  const [paymentAwaitingReview, setPaymentAwaitingReview] = useState(false);
  const progressRestoredRef = useRef(false);
  const progressSaveSkipRef = useRef(true);
  const PAYMENT_FEE_PCT = paymentConfig?.processing_fee_percent ?? 3.8;
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string>("");
  const [confirmedAccessCode, setConfirmedAccessCode] = useState<string>("");
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
  const savedPharmacyIdRef = useRef<string | null>(null);

  const enabledPaymentMethods = useMemo((): PaymentMethodId[] => {
    const methods = paymentConfig?.methods ?? ["mtn_momo", "card"];
    return methods.filter((m): m is PaymentMethodId =>
      m === "mtn_momo" || m === "card" || m === "manual_momo",
    );
  }, [paymentConfig]);

  const manualMomoConfig: ManualMomoConfig | null = paymentConfig?.manual_momo?.enabled
    ? {
        enabled: true,
        merchant_name: paymentConfig.manual_momo.merchant_name,
        pay_code: paymentConfig.manual_momo.pay_code,
        dial_string: paymentConfig.manual_momo.dial_string,
        instructions: paymentConfig.manual_momo.instructions,
      }
    : null;

  useEffect(() => {
    if (paymentConfig) return;
    configService.getPublicConfig().then((cfg) => setPaymentConfig(cfg.payments)).catch(() => {});
  }, [paymentConfig]);

  useEffect(() => {
    if (!paymentConfig || progressRestoredRef.current) return;
    const methods = paymentConfig.methods ?? [];
    if (methods.includes("manual_momo") && paymentConfig.manual_momo?.enabled) {
      setPaymentMethod((m) => (m === "mtn_momo" ? "manual_momo" : m));
    } else if (!methods.includes("manual_momo") && methods.includes("mtn_momo")) {
      setPaymentMethod("mtn_momo");
    }
  }, [paymentConfig]);

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

  // Return from Pesapal hosted checkout (card)
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
        const access =
          sessionStorage.getItem(`pending_order_access_code_${orderId}`) ??
          (await ordersService.getOrderById(orderId).catch(() => null))?.patientAccessCode ??
          "";
        setConfirmedOrderCode(code);
        setConfirmedAccessCode(access);
        clearCheckoutProgress();
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

  // Restore checkout progress (Google Forms–style resume).
  useEffect(() => {
    if (progressRestoredRef.current) return;
    if (effectiveItems.length === 0 && !rxId) {
      progressRestoredRef.current = true;
      progressSaveSkipRef.current = false;
      return;
    }
    const saved = loadCheckoutProgress(cartKey, rxId, recId);
    progressRestoredRef.current = true;
    if (!saved) {
      progressSaveSkipRef.current = false;
      return;
    }
    if (saved.step !== "confirmed") setStep(saved.step);
    if (saved.step !== "cart") {
      toast.info("Continuing where you left off…", { duration: 4000 });
    }
    setFulfillment(
      saved.fulfillment === "delivery" &&
        typeof window !== "undefined" &&
        isDesktopBrowser() &&
        !assessDeliveryLocation(
          usePatientLocationStore.getState().lat,
          usePatientLocationStore.getState().lon,
          usePatientLocationStore.getState().accuracy,
          usePatientLocationStore.getState().source,
        ).ok
        ? "pickup"
        : saved.fulfillment,
    );
    setName(saved.name);
    setPhone(saved.phone);
    setDistrict(saved.district);
    setDeliveryHood(saved.deliveryHood);
    setNotes(saved.notes);
    setPaymentMethod(saved.paymentMethod);
    setManualDraft(saved.manualDraft);
    setPendingManualOrder(saved.pendingManualOrder);
    savedPharmacyIdRef.current = saved.selectedPharmacyId;
    progressSaveSkipRef.current = false;
  }, [cartKey, rxId, recId, effectiveItems.length]);

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

  // Do not auto-request GPS here — browsers block prompts without a user tap.
  // Real road distances (OSRM) from patient → each pharmacy with known coordinates.
  useEffect(() => {
    if (!patientLocation) {
      setRoadDistances(new Map());
      return;
    }
    if (fulfillment === "delivery" && !deliveryLocationAssessment.ok) {
      setRoadDistances(new Map());
      return;
    }
    const destinations = pharmacyList
      .filter((p) => p.coordinates != null)
      .map((p) => ({
        id: p.id,
        lat: p.coordinates![0],
        lon: p.coordinates![1],
      }));
    if (destinations.length === 0) {
      setRoadDistances(new Map());
      return;
    }
    let cancelled = false;
    setRoadDistancesLoading(true);
    configService
      .getRoadDistances(patientLocation[0], patientLocation[1], destinations)
      .then((rows) => {
        if (cancelled) return;
        const map: RoadDistanceMap = new Map();
        for (const row of rows) {
          map.set(row.id, {
            distanceKm: row.distanceKm,
            roadDistanceKm: row.roadDistanceKm,
            fromRouting: true,
          });
        }
        setRoadDistances(map);
      })
      .catch(() => {
        if (!cancelled) setRoadDistances(new Map());
      })
      .finally(() => {
        if (!cancelled) setRoadDistancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientLocation, pharmacyList, fulfillment, deliveryLocationAssessment.ok]);

  // Auto-switch to pickup when delivery location is not trustworthy or too far.
  useEffect(() => {
    if (fulfillment !== "delivery") return;

    if (!deliveryLocationAssessment.ok) {
      if (deliveryLocationBlocked === "outside_kigali" || deliveryLocationBlocked === "desktop_unreliable") {
        setFulfillment("pickup");
        toast.info(locationBlockMessage(deliveryLocationBlocked));
      }
      return;
    }

    if (!patientLocation) return;

    const roadDist = selectedOption && selectedOption.roadDistanceKm > 0
      ? selectedOption.roadDistanceKm
      : selectedOption && selectedOption.distanceKm > 0
        ? roadDistanceKm(selectedOption.distanceKm)
        : 0;
    if (roadDist > 20) {
      setFulfillment("pickup");
      toast.info(t.cart_delivery_too_far);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, patientLocation, deliveryLocationBlocked]);

  // Authoritative delivery fee from API when GPS + pharmacy coordinates are known
  useEffect(() => {
    if (fulfillment !== "delivery" || !locationForDelivery || !selectedOption) {
      setApiDeliveryFee(null);
      setDeliveryUnavailable(null);
      return;
    }
    const seller = selectedOption.pharmacy;
    if (!seller.coordinates) {
      setApiDeliveryFee(null);
      setDeliveryUnavailable("Pharmacy location is not on file — delivery fee unavailable.");
      return;
    }
    const fromLat = seller.coordinates[0];
    const fromLon = seller.coordinates[1];
    const [toLat, toLon] = locationForDelivery;
    let cancelled = false;
    configService
      .getDeliveryQuote(fromLat, fromLon, toLat, toLon)
      .then((q) => {
        if (cancelled) return;
        if (!q.delivery_available) {
          setDeliveryUnavailable(q.pickup_only_reason ?? "Delivery not available to this address");
          setApiDeliveryFee(null);
          return;
        }
        setDeliveryUnavailable(null);
        setApiDeliveryFee(q.delivery_fee_rwf);
      })
      .catch(() => {
        if (!cancelled) setApiDeliveryFee(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fulfillment, locationForDelivery, selectedOption]);

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
      fulfillment === "delivery" ? locationForDelivery : patientLocation,
      rxInsuranceProvider,
      rxInsuranceDiscountPct,
      roadDistances.size > 0 ? roadDistances : undefined,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched.map((e: CartEntry) => `${e.medicine.id}:${e.sellMode}:${e.qty}`).join(","), pharmacyList, listingsMap, fulfillment, patientDistrict, patientLocation, locationForDelivery, rxInsuranceProvider, rxInsuranceDiscountPct, roadDistances]
  );

  // Keep selected pharmacy in sync when road distances refresh rankings.
  useEffect(() => {
    if (!selectedOption && savedPharmacyIdRef.current && pharmacyOptions.length) {
      const restored = pharmacyOptions.find((o) => o.pharmacy.id === savedPharmacyIdRef.current);
      if (restored) {
        setSelectedOption(restored);
        savedPharmacyIdRef.current = null;
      }
    }
  }, [pharmacyOptions, selectedOption]);

  useEffect(() => {
    if (!selectedOption) return;
    const updated = pharmacyOptions.find((o) => o.pharmacy.id === selectedOption.pharmacy.id);
    if (updated && updated.roadDistanceKm !== selectedOption.roadDistanceKm) {
      setSelectedOption(updated);
    }
  }, [pharmacyOptions, selectedOption]);

  // Persist checkout progress whenever the patient moves through steps.
  useEffect(() => {
    if (progressSaveSkipRef.current || !progressRestoredRef.current) return;
    if (step === "confirmed") return;
    if (effectiveItems.length === 0 && !rxId) return;
    saveCheckoutProgress({
      v: 1,
      savedAt: Date.now(),
      rxId,
      recId,
      cartKey,
      step,
      selectedPharmacyId: selectedOption?.pharmacy.id ?? null,
      fulfillment,
      name,
      phone,
      district,
      deliveryHood,
      notes,
      deferDeliveryFee: false,
      paymentMethod,
      manualDraft,
      pendingManualOrder,
    });
  }, [
    step,
    selectedOption,
    fulfillment,
    name,
    phone,
    district,
    deliveryHood,
    notes,
    paymentMethod,
    manualDraft,
    pendingManualOrder,
    cartKey,
    rxId,
    recId,
    effectiveItems.length,
  ]);

  // Road-distance estimate (prefer OSRM routing from API)
  const selectedRoadDistKm =
    selectedOption && selectedOption.roadDistanceKm > 0
      ? selectedOption.roadDistanceKm
      : patientLocation && selectedOption && selectedOption.distanceKm > 0
        ? roadDistanceKm(selectedOption.distanceKm)
        : 0;
  const deliveryTooFar = selectedRoadDistKm > 20;

  // Distance-based fee when GPS is available; fall back to subtotal threshold otherwise.
  const deliveryHoodOptions = hoodsForDistrict(district);
  const deliveryLocationReady =
    fulfillment !== "delivery" || deliveryLocationAssessment.ok;
  const deliveryFeeKnown =
    fulfillment === "pickup" || deliveryLocationAssessment.ok;
  const deliveryFee =
    fulfillment === "pickup"
      ? 0
      : !deliveryLocationAssessment.ok
        ? null
        : apiDeliveryFee != null
          ? apiDeliveryFee
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
  const amountDueNow = total;
  const stepIdx      = STEPS.findIndex((s) => s.key === step);

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
          onClick={() => {
            if (fulfillment === "delivery") requestLocationForDelivery();
            setStep("pharmacy");
          }}
          className="w-full mt-4 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-base transition-colors py-3.5 flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          {t.cart_find_pharmacy}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );

  // ── STEP 2: Pharmacy selection ─────────────────
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
          const disabled   = isDelivery && (deliveryTooFar || deliveryLocationBlocked === "outside_kigali");
          return (
            <button
              key={mode}
              onClick={() => {
                if (disabled) return;
                if (mode === "delivery") {
                  setFulfillment("delivery");
                  requestLocationForDelivery();
                } else {
                  setFulfillment("pickup");
                }
              }}
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
        <div className={cn("flex items-start gap-2 rounded-2xl px-4 py-3 mb-3", CART_ALERT_AMBER)}>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className={cn("text-xs font-medium", CART_ALERT_AMBER_BODY)}>
            {t.cart_delivery_too_far}
          </p>
        </div>
      )}

      {isDesktopBrowser() && fulfillment === "delivery" && !deliveryLocationAssessment.ok && (
        <div className={cn("flex items-start gap-2 rounded-2xl px-4 py-2.5 mb-3", CART_ALERT_INFO)}>
          <Info className="w-4 h-4 text-slate-500 dark:text-slate-300 shrink-0 mt-0.5" />
          <p className={cn("text-xs", CART_ALERT_INFO_BODY)}>
            {deliveryLocationBlocked === "desktop_unreliable" || deliveryLocationBlocked === "low_accuracy"
              ? t.cart_location_desktop_unreliable
              : t.cart_location_desktop_hint}
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
        <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-4", CART_ALERT_AMBER)}>
          <Navigation className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-bold", CART_ALERT_AMBER_TITLE)}>{t.cart_location_delivery_title}</p>
            <p className={cn("text-xs mt-0.5", CART_ALERT_AMBER_BODY)}>
              {deliveryLocationBlocked && deliveryLocationBlocked !== "no_gps"
                ? locationBlockMessage(deliveryLocationBlocked)
                : locationPermissionHelp
                ? locationPermissionHelp
                : locationStatus === "unsupported"
                  ? "GPS is not available in this browser — choose pickup or use the mobile app."
                  : locationStatus === "pending"
                    ? t.cart_location_detecting
                    : t.cart_location_delivery_prompt}
            </p>
            {locationStatus !== "unsupported" && locationStatus !== "denied" && (
              <button
                type="button"
                onClick={requestLocationForDelivery}
                disabled={locationStatus === "pending"}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-50 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-600 rounded-xl px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-60"
              >
                <Navigation className="w-3.5 h-3.5" />
                {locationStatus === "pending" ? "Detecting location…" : "Enable location"}
              </button>
            )}
          </div>
        </div>
      )}

      {locationApproximate && (
        <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-4", CART_ALERT_SKY)}>
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-bold", CART_ALERT_SKY_TITLE)}>Approximate location</p>
            <p className={cn("text-xs mt-0.5", CART_ALERT_SKY_BODY)}>
              GPS accuracy is about {Math.round(locationAccuracy! / 100) / 10} km.
              {" For better distance estimates, refresh location or move outdoors."}
            </p>
            <button
              type="button"
              onClick={requestLocationForDelivery}
              disabled={locationStatus === "pending"}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-50 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-600 rounded-xl px-3 py-1.5 hover:bg-sky-100 dark:hover:bg-sky-950/60 disabled:opacity-60"
            >
              <Navigation className="w-3.5 h-3.5" />
              {locationStatus === "pending" ? "Refreshing…" : "Refresh location"}
            </button>
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

      {/* How pharmacies are ranked */}
      <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-5", CART_ALERT_INFO)}>
        <Brain className="w-4 h-4 text-farumasi-600 dark:text-farumasi-400 shrink-0 mt-0.5" />
        <p className={cn("text-xs", CART_ALERT_INFO_BODY)}>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{t.cart_names_hidden}</span>{" "}
          {t.cart_names_hidden_sub}
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
          const isSelected  = selectedOption?.pharmacy.id === opt.pharmacy.id;
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
            : !deliveryLocationAssessment.ok ? null
            : cardRoadDistKm > 0 ? calcDeliveryFee(cardRoadDistKm)
            : 1500;
          const cardMedicineDue = opt.priceAfterInsurance;
          const cardTotal = cardMedicineDue + (cardDeliveryFee ?? 0);

          return (
            <div
              key={opt.pharmacy.id}
              className={cn(
                "w-full rounded-3xl border-2 transition-all overflow-hidden",
                isSelected
                  ? "border-farumasi-500 bg-farumasi-50 shadow-md dark:bg-farumasi-950/35 dark:border-farumasi-600"
                  : "border-slate-100 bg-white hover:border-farumasi-200 hover:shadow-sm dark:bg-slate-800/95 dark:border-slate-700 dark:hover:border-farumasi-700"
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
                          <span className="text-sm font-bold">{getInitials(opt.pharmacy.name)}</span>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {opt.pharmacy.name}
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
                        {cardRoadDistKm > 0 && ` \u00b7 ${cardRoadDistKm.toFixed(1)} km ${opt.roadDistanceFromRouting ? "road" : "est. road"}`}
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
                      const isNearest = opt.roadDistanceKm > 0 &&
                        pharmacyOptions.every(o => o === opt || o.roadDistanceKm === 0 || o.roadDistanceKm >= opt.roadDistanceKm);
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
                    <span className="font-medium">
                      {cardRoadDistKm.toFixed(1)} km {opt.roadDistanceFromRouting ? "road" : "est. road"}
                    </span>
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
                      {deliveryLocationAssessment.ok && cardRoadDistKm > 0 && ` (~${cardRoadDistKm.toFixed(1)} km)`}
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
        {selectedOption ? `${t.cart_continue_pharmacy} ${selectedOption.pharmacy.name}` : t.cart_continue_pharmacy_empty}
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
              <p className="text-xs font-bold text-amber-900">{t.cart_location_delivery_title}</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {locationPermissionHelp ?? t.cart_location_delivery_prompt}
              </p>
              {locationStatus !== "denied" && (
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locationStatus === "pending"}
                  className="mt-2 text-xs font-bold text-amber-900 underline disabled:opacity-60"
                >
                  {locationStatus === "pending" ? "Detecting location…" : "Enable location"}
                </button>
              )}
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
    const phoneReady =
      paymentMethod === "card" || paymentMethod === "manual_momo" || phone.trim().length >= 9;
    const manualProofReady =
      paymentMethod !== "manual_momo" || manualDraft.proofUrls.length > 0;
    const canPlaceManual =
      !!selectedOption && deliveryLocationReady && phoneReady && manualProofReady;
    const canPlace   = canPlaceManual;
    const showPendingManualResume = Boolean(pendingManualOrder && paymentMethod === "manual_momo");
    const orderSubtotal = Math.round(amountDueNow > 0 ? amountDueNow : total);
    const processingFee =
      paymentMethod === "manual_momo"
        ? 0
        : orderSubtotal > 0
          ? Math.round(orderSubtotal * PAYMENT_FEE_PCT / 100)
          : 0;
    const totalWithFee = orderSubtotal + processingFee;

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep("details")}
            aria-label="Back to delivery details"
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-farumasi-700 dark:hover:text-emerald-400 hover:bg-farumasi-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.cart_payment_title}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.cart_payment_subtitle}</p>
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

        <div className="mb-6">
          {showPendingManualResume && pendingManualOrder && manualMomoConfig ? (
            <>
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
                <p className="font-semibold">Resume payment for order {pendingManualOrder.orderCode}</p>
                <p className="mt-0.5 text-xs text-sky-800 dark:text-sky-200">
                  Your order was saved. Upload your MoMo proof below to finish checkout.
                </p>
              </div>
              <ManualPaymentPanel
                orderId={pendingManualOrder.orderId}
                orderCode={pendingManualOrder.orderCode}
                amount={pendingManualOrder.amount}
                config={manualMomoConfig}
                formatPrice={formatPrice}
                draft={manualDraft}
                onDraftChange={setManualDraft}
                onSubmitted={() => {
                  setConfirmedOrderCode(pendingManualOrder.orderCode);
                  setConfirmedAccessCode(pendingManualOrder.accessCode);
                  setPaymentAwaitingReview(true);
                  setPendingManualOrder(null);
                  clearCheckoutProgress();
                  if (!isLocked) clear();
                  setStep("confirmed");
                }}
              />
            </>
          ) : (
            <>
              <PaymentCheckout
                method={paymentMethod}
                onMethodChange={setPaymentMethod}
                phone={phone}
                onPhoneChange={setPhone}
                feePercent={PAYMENT_FEE_PCT}
                orderSubtotal={orderSubtotal}
                processingFee={processingFee}
                totalWithFee={totalWithFee}
                formatPrice={formatPrice}
                momoNumberLabel={t.cart_momo_number}
                enabledMethods={enabledPaymentMethods}
                manualConfig={manualMomoConfig}
                manualDraft={manualDraft}
                onManualDraftChange={setManualDraft}
              />
            </>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5 mb-6">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Your pickup/delivery code and pharmacy contacts unlock once payment is fully confirmed.
          </p>
        </div>

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
                        : formatPrice(deliveryFee)}
                  </span>
                </div>
                {deliveryFee != null && deliveryFee > 0 && (
                  <p className="text-[10px] text-violet-700 mt-1">
                    Included in your total below.
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
              <span className="font-bold text-slate-900">{t.cart_total}</span>
              <span className="font-extrabold text-farumasi-700 text-lg">
                {formatPrice(amountDueNow)}
              </span>
            </div>
          </div>
          {selectedOption && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <span>{selectedOption.pharmacy.name} · {selectedOption.pharmacy.district}</span>
            </div>
          )}
        </div>

        {!showPendingManualResume && (
        <button
          disabled={!canPlace || isPlacingOrder}
            onClick={async () => {
            if (!canPlace || isPlacingOrder) return;
            if (isGuest) {
              toast.error("Please sign in to place an order.");
              return;
            }
            if (paymentMethod === "manual_momo" && !manualDraft.proofUrls.length) {
              toast.error("Upload your MoMo payment proof before placing the order.");
              return;
            }
            if (
              fulfillment === "delivery" &&
              (!district || !deliveryHood || !isKigaliDeliveryDistrict(district) || !deliveryLocationAssessment.ok)
            ) {
              toast.error(
                deliveryLocationBlocked && deliveryLocationBlocked !== "no_gps"
                  ? locationBlockMessage(deliveryLocationBlocked)
                  : patientLocation
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
                selected_recommendation_id: recId ?? undefined,
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
                defer_delivery_fee: false,
              });

              const orderId = result.id;
              const orderCode = result.order_code ?? result.id ?? ORDER_NUM;
              const generatedAccessCode = result.patient_access_code ?? "";
              if (generatedAccessCode) {
                sessionStorage.setItem(`pending_order_access_code_${orderId}`, generatedAccessCode);
              }
              setConfirmedAccessCode(generatedAccessCode);

              if (paymentMethod === "manual_momo") {
                setPaymentStepLabel("Submitting payment proof…");
                try {
                  await paymentsService.submitManual(orderId, {
                    proof_urls: manualDraft.proofUrls,
                    patient_note: manualDraft.note.trim() || undefined,
                    phone: phone.trim() || undefined,
                  });
                  setConfirmedOrderCode(orderCode);
                  setPaymentAwaitingReview(true);
                  setPendingManualOrder(null);
                  clearCheckoutProgress();
                  if (!isLocked) clear();
                  setStep("confirmed");
                } catch (proofErr) {
                  setPendingManualOrder({
                    orderId,
                    orderCode,
                    amount: totalWithFee,
                    accessCode: generatedAccessCode,
                  });
                  toast.error(
                    checkoutErrorMessage(proofErr, "Order created but proof upload failed. Submit proof below to continue."),
                  );
                }
                return;
              }

              const redirectUrl = `${window.location.origin}/cart?payment_return=1&order_id=${orderId}`;
              setPaymentStepLabel(
                paymentMethod === "card" ? "Opening Pesapal checkout…" : "Sending MTN MoMo request…",
              );
              const init = await paymentsService.initiate(orderId, {
                phone: phone.trim(),
                name: name.trim() || undefined,
                redirect_url: redirectUrl,
                payment_method: paymentMethod,
              });

              if (init.checkout_url) {
                sessionStorage.setItem(`pending_order_code_${orderId}`, orderCode);
                if (init.message) toast.info(init.message, { duration: 8000 });
                window.location.href = init.checkout_url;
                return;
              }

              if (init.message) {
                toast.info(init.message, { duration: 10000 });
              }
              if (init.payment_status !== "paid") {
                setPaymentStepLabel(t.cart_momo_wait);
                await paymentsService.waitUntilPaid(orderId);
              }

              const paidOrder = await ordersService.getOrderById(orderId).catch(() => null);
              setConfirmedAccessCode(paidOrder?.patientAccessCode ?? "");
              setConfirmedOrderCode(orderCode);
              clearCheckoutProgress();
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
              : "bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-400 dark:text-slate-500"
          )}
        >
          {isPlacingOrder
            ? paymentStepLabel || t.cart_processing
            : paymentMethod === "manual_momo"
              ? `Place order · ${formatPrice(totalWithFee)}`
              : `${t.cart_place_order} · ${formatPrice(totalWithFee)}`}
        </button>
        )}
        {isPlacingOrder && amountDueNow > 0 && !showPendingManualResume && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
            {paymentStepLabel || "Complete payment to continue."}
          </p>
        )}
      </div>
    );
  }

  // ── STEP 5: Confirmed ─────────────────────────────────────────
  if (step === "confirmed" && fulfillment === "pickup") {
    const orderCode = confirmedOrderCode || ORDER_NUM;
    const fulfilmentUnlocked = Boolean(confirmedAccessCode);
    const mapsUrl   = selectedOption?.pharmacy.coordinates
      ? `https://www.google.com/maps?q=${selectedOption.pharmacy.coordinates[0]},${selectedOption.pharmacy.coordinates[1]}`
      : selectedOption
        ? `https://www.google.com/maps/search/${encodeURIComponent(selectedOption.pharmacy.name + " pharmacy Rwanda")}`
        : "#";

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col items-center min-h-[60vh]">
        <StepBar />

        {/* Header */}
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
            {paymentAwaitingReview ? "Order placed — payment under review" : "Ready for Pickup!"}
          </h1>
          <p className="text-slate-500 text-sm">
            {paymentAwaitingReview
              ? "We received your MoMo proof and will confirm your payment shortly."
              : "Payment confirmed · Head to the pharmacy"}
          </p>
          <span className="mt-3 px-4 py-1.5 bg-farumasi-50 text-farumasi-700 font-bold text-sm rounded-full border border-farumasi-200">
            {orderCode}
          </span>
        </div>

        {/* Access code reminder */}
        {confirmedAccessCode && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-700">{t.cart_your_access}</p>
              <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{confirmedAccessCode}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t.cart_access_pickup}</p>
            </div>
          </div>
        )}

        {!fulfilmentUnlocked && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-sm font-semibold text-slate-800">Pharmacy details unlock after payment</p>
            <p className="text-xs text-slate-500 mt-1">
              Your pickup code and the pharmacy&apos;s full location and contacts appear once payment is confirmed.
            </p>
          </div>
        )}

        {/* Pharmacy reveal */}
        {fulfilmentUnlocked && selectedOption && (
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
        {fulfilmentUnlocked && selectedOption && (
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
          {paymentAwaitingReview ? "Order placed — payment under review" : t.cart_confirmed_title}
        </h1>
        <p className="text-slate-500 text-sm">
          {paymentAwaitingReview
            ? "We received your MoMo proof and will confirm your payment shortly."
            : t.cart_confirmed_subtitle}
        </p>
        <span className="mt-3 px-4 py-1.5 bg-farumasi-50 text-farumasi-700 font-bold text-sm rounded-full border border-farumasi-200">
          {confirmedOrderCode || ORDER_NUM}
        </span>
      </div>

      {/* Access code reminder */}
      {confirmedAccessCode && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">{t.cart_your_access}</p>
            <p className="text-base font-extrabold text-amber-900 tracking-widest font-mono">{confirmedAccessCode}</p>
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
          <span className="font-bold text-slate-900">MTN MoMo · Card (Pesapal)</span>
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
          <span className="font-bold text-slate-900">{t.cart_total_charged}</span>
          <span className="font-extrabold text-farumasi-700">{formatPrice(amountDueNow)}</span>
        </div>
      </div>

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
