"use client";

import { CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodId = "mtn_momo" | "card";

export const PAYMENT_METHODS: {
  id: PaymentMethodId;
  label: string;
  network: string;
  hint: string;
  accent: string;
  accentSoft: string;
  border: string;
  badge?: string;
}[] = [
  {
    id: "mtn_momo",
    label: "MTN MoMo",
    network: "MTN Mobile Money",
    hint: "Pay from your MTN wallet",
    accent: "text-amber-700",
    accentSoft: "bg-amber-400",
    border: "border-amber-400",
    badge: "Default",
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    network: "Visa · Mastercard",
    hint: "Secure card checkout via Pesapal",
    accent: "text-blue-700",
    accentSoft: "bg-blue-600",
    border: "border-blue-500",
  },
];

function MethodIcon({ id, className }: { id: PaymentMethodId; className?: string }) {
  if (id === "card") {
    return <CreditCard className={className} />;
  }
  return <Smartphone className={className} />;
}

interface PaymentCheckoutProps {
  method: PaymentMethodId;
  onMethodChange: (method: PaymentMethodId) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  feePercent: number;
  orderSubtotal: number;
  processingFee: number;
  totalWithFee: number;
  formatPrice: (n: number) => string;
  momoNumberLabel?: string;
}

export function PaymentCheckout({
  method,
  onMethodChange,
  phone,
  onPhoneChange,
  feePercent,
  orderSubtotal,
  processingFee,
  totalWithFee,
  formatPrice,
  momoNumberLabel = "MTN MoMo number",
}: PaymentCheckoutProps) {
  const selected = PAYMENT_METHODS.find((m) => m.id === method)!;
  const needsPhone = method !== "card";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="absolute -bottom-6 left-1/3 h-24 w-24 rounded-full bg-amber-400/10 blur-xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Lock className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90">
              Secure checkout
            </p>
            <h2 className="text-lg font-extrabold tracking-tight">Choose how to pay</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              MTN MoMo or card — MoMo via MTN, cards via Pesapal. A {feePercent}% fee is added to your total.
            </p>
          </div>
          <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-400/80" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => {
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMethodChange(m.id)}
              className={cn(
                "group relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200",
                active
                  ? cn("border-l-4 bg-white shadow-md ring-2 ring-farumasi-100", m.border)
                  : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white",
              )}
            >
              {m.badge && (
                <span className="absolute -top-2.5 left-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                  {m.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                    m.accentSoft,
                  )}
                >
                  <MethodIcon id={m.id} className="h-5 w-5" />
                </div>
                {active && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-farumasi-600" />
                )}
              </div>
              <p className={cn("mt-3 text-sm font-bold", active ? "text-slate-900" : "text-slate-700")}>
                {m.label}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{m.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className={cn(
            "flex items-center gap-3 border-b px-5 py-3.5",
            selected.id === "mtn_momo" && "bg-amber-50/80 border-amber-100",
            selected.id === "card" && "bg-blue-50/80 border-blue-100",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-white",
              selected.accentSoft,
            )}
          >
            <MethodIcon id={selected.id} className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pay with</p>
            <p className={cn("text-sm font-extrabold", selected.accent)}>{selected.network}</p>
          </div>
        </div>

        <div className="p-5">
          {needsPhone ? (
            <>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {momoNumberLabel} <span className="text-red-400">*</span>
              </label>
              <p className="mb-3 text-[11px] text-slate-500">
                You will approve the payment on your MTN phone (MoMo PIN or USSD prompt).
              </p>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +250
                </span>
                <input
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  placeholder="0781 234 567"
                  type="tel"
                  autoComplete="tel"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 pl-14 pr-4 text-base font-semibold tracking-wide text-slate-900 outline-none transition-all focus:border-farumasi-400 focus:bg-white focus:ring-4 focus:ring-farumasi-100"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                You will be redirected to a secure Pesapal page to enter your card details.
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="rounded-md bg-blue-700 px-2 py-1 text-[10px] font-bold text-white">VISA</span>
                  <span className="rounded-md bg-orange-600 px-2 py-1 text-[10px] font-bold text-white">MC</span>
                </div>
                <p className="text-xs text-slate-500">256-bit encrypted · PCI compliant</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {orderSubtotal > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Payment summary
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Order amount</span>
              <span className="font-semibold text-slate-900">{formatPrice(orderSubtotal)}</span>
            </div>
            {processingFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Processing fee ({feePercent}%)</span>
                <span className="font-semibold text-slate-900">{formatPrice(processingFee)}</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Processing fee is paid by you, not FARUMASI.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-bold text-slate-800">Total to pay now</span>
            <span className="text-xl font-extrabold text-farumasi-700">{formatPrice(totalWithFee)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
