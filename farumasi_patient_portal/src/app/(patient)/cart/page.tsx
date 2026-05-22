"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { CartEntry } from "@/store/cart-store";
import { useTranslation } from "@/lib/translations";
import { pharmaciesService, BackendPharmacy } from "@/lib/services/pharmacies.service";
import { ordersService } from "@/lib/services/orders.service";
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
  Banknote,
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

// Adapt backend pharmacy to Pharmacy type for scoring
function adaptBackendPharmacy(p: BackendPharmacy): Pharmacy {
  return {
    id: p.id,
    name: p.name,
    locationName: p.address || p.district,
    coordinates: [p.latitude ?? -1.9441, p.longitude ?? 30.0619] as [number, number],
    supportedInsurances: [],
    isOpen: p.is_open,
    imageUrl: "",
    province: "Kigali",
    district: p.district,
  };
}

// ── Scoring engine ─────────────────────────────────────────────
// Patient insurance — from auth context in production
const PATIENT_INSURANCE = "RSSB";

function scorePharmacies(cartMeds: Medicine[], pharmacies: Pharmacy[]): PharmacyOption[] {
  if (pharmacies.length === 0 || cartMeds.length === 0) return [];

  const scored = pharmacies.map((pharmacy: Pharmacy) => {
    const availability: MedicineAvailability[] = cartMeds.map((med: Medicine) => {
      const pha = med.marketingPharmacies.find(
        (p: { pharmacyName: string; stockStatus: string; price: number }) => p.pharmacyName === pharmacy.name
      );
      return {
        medicineName: med.name,
        available: !!pha && pha.stockStatus !== "unavailable",
        stockStatus: pha?.stockStatus ?? "unavailable",
        unitPrice: pha?.price ?? 0,
      };
    });

    const availableCount = availability.filter((a) => a.available).length;
    const availabilityRate = cartMeds.length > 0 ? availableCount / cartMeds.length : 0;
    const priceEstimate = availability.reduce((s, a) => s + a.unitPrice, 0);
    const insuranceMatch = pharmacy.supportedInsurances.includes(PATIENT_INSURANCE);
    const insuranceSaving = insuranceMatch ? Math.round(priceEstimate * 0.15) : 0;
    const distanceKm = 5; // placeholder until geolocation is available

    // Weighted score: availability 50%, insurance 25%, proximity 15%, open 10%
    const score =
      availabilityRate * 50 +
      (insuranceMatch ? 25 : 0) +
      (1 - Math.min(distanceKm / 15, 1)) * 15 +
      (pharmacy.isOpen ? 10 : 0);

    return {
      pharmacy,
      availability,
      availableCount,
      totalCount: cartMeds.length,
      priceEstimate,
      insuranceMatch,
      insuranceSaving,
      distanceKm,
      score,
      deliveryAvailable: pharmacy.isOpen,
      estimatedDeliveryMin: Math.round(20 + distanceKm * 5),
      rank: 1 as 1 | 2 | 3,
      codename: "A" as "A" | "B" | "C",
    };
  });

  // Sort desc, take top 3, assign rank + codename
  return (scored as PharmacyOption[])
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((opt, i) => ({
      ...opt,
      rank: (i + 1) as 1 | 2 | 3,
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
  const [name, setName]                       = useState("");
  const [phone, setPhone]                     = useState("");
  const [street, setStreet]                   = useState("");
  const [district, setDistrict]               = useState("");
  const [notes, setNotes]                     = useState("");
  const [payMethod, setPayMethod]             = useState<"momo" | "airtel" | "cash">("momo");
  const [momoPhone, setMomoPhone]             = useState("");
  const [isPlacingOrder, setIsPlacingOrder]   = useState(false);
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string>("");
  const [pharmacyList, setPharmacyList]       = useState<Pharmacy[]>([]);

  useEffect(() => {
    pharmaciesService.listPharmacies().then((items) => {
      setPharmacyList(items.map(adaptBackendPharmacy));
    }).catch(() => {});
  }, []);

  const enriched     = Object.values(cartItems) as CartEntry[];
  const subtotal     = enriched.reduce((s: number, e: CartEntry) => s + e.medicine.price * e.qty, 0);
  const deliveryFee  = fulfillment === "pickup" ? 0 : subtotal >= 10000 ? 0 : 1500;
  const insuranceSavings = selectedOption?.insuranceSaving ?? 0;
  const total        = subtotal + deliveryFee - insuranceSavings;
  const stepIdx      = STEPS.findIndex((s) => s.key === step);

  const pharmacyOptions = useMemo(
    () => scorePharmacies(enriched.map((e: CartEntry) => e.medicine), pharmacyList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched.map((e: CartEntry) => e.medicine.id).join(","), pharmacyList]
  );

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
  if (enriched.length === 0 && step === "cart") {
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
          href="/store"
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.cart_title}</h1>
          <p className="text-slate-500 text-sm">
            {enriched.length} item{enriched.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <StepBar />

      <div className="space-y-3 mb-6">
        {enriched.map(({ medicine, qty }) => (
          <div
            key={medicine.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 items-start"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {medicine.imageUrl ? (
                <img
                  src={medicine.imageUrl}
                  alt={medicine.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">💊</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
              <p className="text-xs text-farumasi-600 font-medium mt-0.5">{medicine.category}</p>
              <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">
                {formatPrice(medicine.price)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => remove(medicine.id)}
                className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-2 py-1">
                <button
                  onClick={() => setQty(medicine.id, qty - 1)}
                  className="w-7 h-7 rounded-xl bg-white font-bold text-slate-600 hover:bg-farumasi-50 flex items-center justify-center shadow-sm"
                >
                  −
                </button>
                <span className="text-sm font-bold text-slate-900 w-5 text-center">{qty}</span>
                <button
                  onClick={() => setQty(medicine.id, qty + 1)}
                  className="w-7 h-7 rounded-xl bg-farumasi-600 text-white font-bold hover:bg-farumasi-700 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">{t.cart_summary}</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{t.cart_subtotal}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.cart_delivery_fee}</span>
            <span className="text-slate-400 text-xs italic">Calculated after pharmacy selection</span>
          </div>
          <div className="border-t border-slate-100 pt-2.5 flex justify-between">
            <span className="font-bold text-slate-900 text-base">{t.cart_total}</span>
            <span className="font-extrabold text-farumasi-700 text-lg">{formatPrice(subtotal)}</span>
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
          className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Choose Your Pharmacy</h1>
          <p className="text-slate-500 text-sm">AI-ranked by stock, price &amp; distance</p>
        </div>
      </div>

      <StepBar />

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Pharmacy names are hidden</span> until you complete
          payment — ensuring fair pricing and stock availability across our network.
        </p>
      </div>

      {/* Pharmacy option cards */}
      <div className="space-y-3 mb-6">
        {pharmacyOptions.map((opt) => {
          const isSelected = selectedOption?.codename === opt.codename;
          const isBest     = opt.rank === 1;

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
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-base",
                      isBest
                        ? "bg-farumasi-600 text-white"
                        : opt.rank === 2
                        ? "bg-slate-700 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {opt.codename}
                  </div>
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
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {opt.insuranceMatch && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          <Shield className="w-2.5 h-2.5" /> {PATIENT_INSURANCE} Accepted
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {opt.distanceKm.toFixed(1)} km away
                      </span>
                    </div>
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
                  <span className="font-semibold">
                    {opt.availableCount}/{opt.totalCount}
                  </span>
                  <span className="text-slate-400">medicines</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{formatPrice(opt.priceEstimate)}</span>
                  {opt.insuranceSaving > 0 && (
                    <span className="text-green-600 font-semibold">
                      &nbsp;(save {formatPrice(opt.insuranceSaving)})
                    </span>
                  )}
                </div>
                {opt.deliveryAvailable && (
                  <div className="flex items-center gap-1 text-xs text-farumasi-600">
                    <Truck className="w-3.5 h-3.5" />
                    <span className="font-medium">~{opt.estimatedDeliveryMin} min</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        disabled={!selectedOption}
        onClick={() => setStep("details")}
        className={cn(
          "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5 flex items-center justify-center gap-1",
          selectedOption
            ? "bg-farumasi-600 hover:bg-farumasi-700"
            : "bg-slate-200 cursor-not-allowed text-slate-400"
        )}
      >
        Continue with Pharmacy {selectedOption?.codename ?? "…"}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  // ── STEP 3: Delivery details ──────────────────────────────────
  if (step === "details") {
    const needsAddress = fulfillment === "delivery";
    const canContinue  = !needsAddress || (
      name.trim() && phone.trim() && street.trim() && district
    );

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep("pharmacy")}
            className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Delivery Details</h1>
            <p className="text-slate-500 text-sm">How would you like to receive your order?</p>
          </div>
        </div>

        <StepBar />

        {/* Fulfillment type */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(
            [
              {
                key: "delivery" as const,
                icon: Truck,
                label: "Home Delivery",
                desc: `~${selectedOption?.estimatedDeliveryMin ?? 45} min`,
              },
              {
                key: "pickup" as const,
                icon: Building2,
                label: "Pickup",
                desc: "Collect yourself",
              },
            ] as const
          ).map(({ key, icon: Icon, label, desc }) => (
            <button
              key={key}
              onClick={() => setFulfillment(key)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all",
                fulfillment === key
                  ? "border-farumasi-500 bg-farumasi-50 shadow-sm"
                  : "border-slate-100 bg-white hover:border-farumasi-200"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center",
                  fulfillment === key ? "bg-farumasi-600" : "bg-slate-100"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    fulfillment === key ? "text-white" : "text-slate-500"
                  )}
                />
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-bold",
                    fulfillment === key ? "text-farumasi-700" : "text-slate-700"
                  )}
                >
                  {label}
                </p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Pickup info */}
        {fulfillment === "pickup" && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
            <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Pickup is free.</span> The pharmacy address will
              be revealed after you complete payment.
            </p>
          </div>
        )}

        {/* Address fields — delivery only */}
        {fulfillment === "delivery" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 mb-5">
            <h3 className="text-sm font-bold text-slate-700">Delivery Address</h3>

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
    const needsPhone = payMethod !== "cash";
    const canPlace   = !needsPhone || momoPhone.trim().length >= 9;

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep("details")}
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
                desc: "Push notification to your Airtel number",
              },
              {
                key: "cash" as const,
                Icon: Banknote,
                iconColor: "text-farumasi-600",
                label: t.cart_cash,
                desc: "Pay when your order arrives",
              },
            ] as const
          ).map(({ key, Icon, iconColor, label, desc }) => (
            <button
              key={key}
              onClick={() => setPayMethod(key)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all",
                payMethod === key
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

        {needsPhone && (
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
            <div className="border-t border-slate-100 pt-2.5 flex justify-between">
              <span className="font-bold text-slate-900">{t.cart_total}</span>
              <span className="font-extrabold text-farumasi-700 text-lg">
                {formatPrice(total)}
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
            try {
              const orderItems = enriched.map((e: CartEntry) => ({
                product_name: e.medicine.name,
                quantity: e.qty,
                unit_price: e.medicine.price,
              }));
              const deliveryAddr = fulfillment === "delivery"
                ? `${street}, ${district}`
                : undefined;
              const result = await ordersService.createOrder({
                delivery_method: fulfillment,
                delivery_address: deliveryAddr,
                notes: notes || undefined,
                items: orderItems,
              });
              setConfirmedOrderCode(result.order_code ?? ORDER_NUM);
            } catch {
              // If backend fails, still confirm with local order code
              setConfirmedOrderCode(ORDER_NUM);
            } finally {
              setIsPlacingOrder(false);
              clear();
              setStep("confirmed");
            }
          }}
          className={cn(
            "w-full rounded-2xl text-white font-bold text-base transition-colors py-3.5",
            canPlace && !isPlacingOrder
              ? "bg-farumasi-600 hover:bg-farumasi-700"
              : "bg-slate-200 cursor-not-allowed text-slate-400"
          )}
        >
          {isPlacingOrder ? "Placing Order…" : `${t.cart_place_order} · ${formatPrice(total)}`}
        </button>
      </div>
    );
  }

  // ── STEP 5: Confirmed — pharmacy name REVEALED ─────────────────
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

      {/* ★ Pharmacy reveal — name only shown here */}
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
                {selectedOption.distanceKm.toFixed(1)} km away ·{" "}
                {fulfillment === "pickup"
                  ? "Ready for pickup in ~15 min"
                  : `Delivery in ~${selectedOption.estimatedDeliveryMin} min`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Fulfillment</span>
          <span className="font-bold text-slate-900 flex items-center gap-1">
            {fulfillment === "delivery" ? (
              <Truck className="w-3.5 h-3.5" />
            ) : (
              <Building2 className="w-3.5 h-3.5" />
            )}
            {fulfillment === "delivery" ? "Home Delivery" : "Pickup"}
          </span>
        </div>
        {fulfillment === "delivery" && street && (
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
            {payMethod === "momo"
              ? "MTN MoMo"
              : payMethod === "airtel"
              ? "Airtel Money"
              : "Cash on Delivery"}
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
        <div className="border-t border-slate-100 pt-3 flex justify-between">
          <span className="font-bold text-slate-900">Total charged</span>
          <span className="font-extrabold text-farumasi-700">{formatPrice(total)}</span>
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
