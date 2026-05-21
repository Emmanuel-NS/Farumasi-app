"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { useTranslation } from "@/lib/translations";
import {
  ShoppingCart, Trash2, ArrowLeft, Store, Check,
  MapPin, CreditCard, Package, Smartphone, Banknote,
} from "lucide-react";

const DISTRICTS = [
  "Bugesera","Burera","Gakenke","Gasabo","Gatsibo","Gicumbi","Gisagara","Huye",
  "Kamonyi","Karongi","Kayonza","Kicukiro","Kirehe","Muhanga","Musanze","Ngoma",
  "Ngororero","Nyabihu","Nyagatare","Nyamagabe","Nyamasheke","Nyanza","Nyarugenge",
  "Nyaruguru","Rubavu","Ruhango","Rulindo","Rusizi","Rutsiro","Rwamagana",
];

type Step = "cart" | "address" | "payment" | "confirmed";
const ORDER_NUM = `ORD-${Math.floor(10000 + Math.random() * 89999)}`;

export default function CartPage() {
  const { items: cartItems, setQty, remove, clear } = useCartStore();
  const t = useTranslation();

  const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "cart",       label: t.cart_step_cart,     icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "address",   label: t.cart_step_delivery,  icon: <MapPin className="w-4 h-4" /> },
    { key: "payment",   label: t.cart_step_payment,   icon: <CreditCard className="w-4 h-4" /> },
    { key: "confirmed", label: t.cart_step_done,      icon: <Package className="w-4 h-4" /> },
  ];

  const [step, setStep]         = useState<Step>("cart");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [street, setStreet]     = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes]       = useState("");
  const [payMethod, setPayMethod] = useState<"momo" | "airtel" | "cash">("momo");
  const [momoPhone, setMomoPhone] = useState("");

  const enriched = Object.values(cartItems);
  const subtotal  = enriched.reduce((s, e) => s + e.medicine.price * e.qty, 0);
  const delivery  = subtotal >= 10000 ? 0 : 1500;
  const total     = subtotal + delivery;
  const stepIdx   = STEPS.findIndex((s) => s.key === step);

  const StepBar = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEPS.map((s, i) => {
        const done   = i < stepIdx;
        const active = i === stepIdx;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all font-bold text-sm",
              done   ? "bg-farumasi-600 text-white" :
              active ? "bg-farumasi-600 text-white ring-4 ring-farumasi-100" :
                       "bg-slate-100 text-slate-400"
            )}>
              {done ? <Check className="w-4 h-4" /> : s.icon}
            </div>
            <p className={cn(
              "hidden sm:block text-xs font-semibold ml-1.5",
              active ? "text-farumasi-700" : done ? "text-slate-500" : "text-slate-300"
            )}>{s.label}</p>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2", i < stepIdx ? "bg-farumasi-400" : "bg-slate-100")} />
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── Empty cart ───────────────────────────────────────────── */
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

  /* ── STEP: Cart ───────────────────────────────────────────── */
  if (step === "cart") return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store" className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.cart_title}</h1>
          <p className="text-slate-500 text-sm">{enriched.length} item{enriched.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <StepBar />
      <div className="space-y-3 mb-6">
        {enriched.map(({ medicine, qty }) => (
          <div key={medicine.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 items-start">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {medicine.imageUrl ? <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" /> : <span className="text-3xl">💊</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
              <p className="text-xs text-farumasi-600 font-medium mt-0.5">{medicine.category}</p>
              <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">{formatPrice(medicine.price)}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={() => remove(medicine.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-2 py-1">
                <button onClick={() => setQty(medicine.id, qty - 1)} className="w-7 h-7 rounded-xl bg-white font-bold text-slate-600 hover:bg-farumasi-50 flex items-center justify-center shadow-sm">−</button>
                <span className="text-sm font-bold text-slate-900 w-5 text-center">{qty}</span>
                <button onClick={() => setQty(medicine.id, qty + 1)} className="w-7 h-7 rounded-xl bg-farumasi-600 text-white font-bold hover:bg-farumasi-700 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">{t.cart_summary}</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-slate-600"><span>{t.cart_subtotal}</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-slate-600">
            <span>{t.cart_delivery_fee}</span>
            <span className={delivery === 0 ? "text-farumasi-600 font-bold" : ""}>{delivery === 0 ? t.cart_free : formatPrice(delivery)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2.5 flex justify-between">
            <span className="font-bold text-slate-900 text-base">{t.cart_total}</span>
            <span className="font-extrabold text-farumasi-700 text-lg">{formatPrice(total)}</span>
          </div>
        </div>
        <button onClick={() => setStep("address")} className="w-full h-13 mt-5 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-base transition-colors py-3.5">
          {t.cart_continue_delivery}
        </button>
        <p className="text-xs text-center text-slate-400 mt-3">
          {delivery === 0 ? t.cart_free_applied : t.cart_free_threshold}
        </p>
      </div>
    </div>
  );

  /* ── STEP: Address ────────────────────────────────────────── */
  if (step === "address") {
    const canContinue = name.trim() && phone.trim() && street.trim() && district;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("cart")} className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.cart_address_title}</h1>
            <p className="text-slate-500 text-sm">Where should we deliver?</p>
          </div>
        </div>
        <StepBar />
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.cart_full_name} <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Uwimana"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.cart_phone} <span className="text-red-400">*</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" type="tel"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.cart_street} <span className="text-red-400">*</span></label>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. KG 15 Ave, Gisozi"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.cart_district} <span className="text-red-400">*</span></label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all bg-white">
              <option value="">Select district…</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.cart_notes} <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2nd floor, blue gate…" rows={3}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all resize-none" />
          </div>
        </div>
        <button disabled={!canContinue} onClick={() => setStep("payment")}
          className={cn("w-full h-13 mt-5 rounded-2xl text-white font-bold text-base transition-colors py-3.5",
            canContinue ? "bg-farumasi-600 hover:bg-farumasi-700" : "bg-slate-200 cursor-not-allowed text-slate-400")}>
          {t.cart_continue_payment}
        </button>
      </div>
    );
  }

  /* ── STEP: Payment ────────────────────────────────────────── */
  if (step === "payment") {
    const needsPhone = payMethod !== "cash";
    const canPlace   = !needsPhone || momoPhone.trim().length >= 9;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("address")} className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.cart_payment_title}</h1>
            <p className="text-slate-500 text-sm">Choose how you want to pay</p>
          </div>
        </div>
        <StepBar />
        <div className="space-y-3 mb-6">
          {([
            { key: "momo",   Icon: Smartphone, iconColor: "text-yellow-600", label: t.cart_momo,   desc: "Push notification to your MTN number" },
            { key: "airtel", Icon: Smartphone, iconColor: "text-red-500",    label: t.cart_airtel, desc: "Push notification to your Airtel number" },
            { key: "cash",   Icon: Banknote,   iconColor: "text-farumasi-600", label: t.cart_cash,  desc: "Pay when your order arrives" },
          ] as const).map(({ key, Icon, iconColor, label, desc }) => (
            <button key={key} onClick={() => setPayMethod(key)}
              className={cn("w-full flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all",
                payMethod === key ? "border-farumasi-500 bg-farumasi-50" : "border-slate-100 bg-white hover:border-farumasi-200")}>
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50", payMethod === key ? "bg-farumasi-50" : "")}>
                <Icon className={cn("w-5 h-5", iconColor)} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                payMethod === key ? "border-farumasi-600 bg-farumasi-600" : "border-slate-300")}>
                {payMethod === key && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
        {needsPhone && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
              {payMethod === "momo" ? "MTN" : "Airtel"} {t.cart_momo_number} <span className="text-red-400">*</span>
            </label>
            <input value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)}
              placeholder={payMethod === "momo" ? "e.g. 0781 234 567" : "e.g. 0731 234 567"} type="tel"
              className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-100 transition-all" />
          </div>
        )}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <div className="flex justify-between text-slate-600 text-sm mb-1.5"><span>{t.cart_subtotal}</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-slate-600 text-sm"><span>{t.cart_delivery_fee}</span>
            <span>{delivery === 0 ? <span className="text-farumasi-600 font-bold">{t.cart_free}</span> : formatPrice(delivery)}</span></div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
            <span className="font-bold text-slate-900">{t.cart_total}</span>
            <span className="font-extrabold text-farumasi-700 text-lg">{formatPrice(total)}</span>
          </div>
        </div>
        <button disabled={!canPlace} onClick={() => { clear(); setStep("confirmed"); }}
          className={cn("w-full h-13 rounded-2xl text-white font-bold text-base transition-colors py-3.5",
            canPlace ? "bg-farumasi-600 hover:bg-farumasi-700" : "bg-slate-200 cursor-not-allowed text-slate-400")}>
          {t.cart_place_order} · {formatPrice(total)}
        </button>
      </div>
    );
  }

  /* ── STEP: Confirmed ──────────────────────────────────────── */
  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center min-h-[60vh]">
      <StepBar />
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-20 h-20 rounded-full bg-farumasi-50 border-4 border-farumasi-200 flex items-center justify-center mb-5">
          <Check className="w-10 h-10 text-farumasi-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t.cart_confirmed_title}</h1>
        <p className="text-slate-500 text-sm">{t.cart_confirmed_subtitle}</p>
        <span className="mt-3 px-4 py-1.5 bg-farumasi-50 text-farumasi-700 font-bold text-sm rounded-full border border-farumasi-200">{ORDER_NUM}</span>
      </div>
      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3 mb-6">
        <div className="flex justify-between text-sm"><span className="text-slate-500">Estimated delivery</span><span className="font-bold text-slate-900">30 – 60 min</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Deliver to</span><span className="font-bold text-slate-900 text-right max-w-[200px]">{street}, {district}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Payment</span>
          <span className="font-bold text-slate-900">{payMethod === "momo" ? "MTN MoMo" : payMethod === "airtel" ? "Airtel Money" : "Cash on Delivery"}</span></div>
        <div className="flex justify-between text-sm border-t border-slate-100 pt-3"><span className="text-slate-500">Total charged</span><span className="font-extrabold text-farumasi-700">{formatPrice(total)}</span></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <Link href="/orders" className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold flex items-center justify-center gap-2 transition-colors">
          <Package className="w-4 h-4" />{t.orders_track}
        </Link>
        <Link href="/store" className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors">
          <Store className="w-4 h-4" />{t.cart_continue_shopping}
        </Link>
      </div>
    </div>
  );
}
