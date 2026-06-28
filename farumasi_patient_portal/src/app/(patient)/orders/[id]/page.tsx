"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ordersService } from "@/lib/services/orders.service";
import { paymentsService } from "@/lib/services/payments.service";
import { deliveryService, type BackendDelivery, coordsPair, deliveryProgress, estimateDeliveryEtaMinutes } from "@/lib/services/delivery.service";
import { mediaUrl } from "@/lib/api";
import type { Order, DeliveryQR } from "@/types";
import { adaptOrder } from "@/lib/mappers/orders.mapper";
import { cn, formatPrice, timeAgo, formatDateTimeLocal } from "@/lib/utils";
import { parseApiDateTime } from "@/lib/datetime";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/lib/translations";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { PaymentCheckout, type PaymentMethodId } from "@/components/cart/payment-checkout";
import { PharmacySwitchTeaser } from "@/components/orders/pharmacy-reassignment-panel";
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Package, Store,
  CheckCircle, Truck, Clock, QrCode, Navigation, ExternalLink,
  Building2, XCircle, ImageOff, Pill, Lock, FileText,
  RotateCcw, ChevronRight, AlertTriangle, Banknote, Receipt,
} from "lucide-react";
import Link from "next/link";

const TrackingMap = dynamic(
  () => import("@/components/shared/tracking-map"),
  { ssr: false, loading: () => <div className="h-[280px] bg-farumasi-50 dark:bg-slate-800 animate-pulse rounded-b-3xl" /> }
);

// Human-readable status labels for both delivery and pickup flows
const DELIVERY_STEPS = [
  { key: "pending_review",    label: "Order Placed",         hint: "Waiting for pharmacy to confirm" },
  { key: "pharmacy_accepted", label: "Pharmacy Confirmed",   hint: "Pharmacy is preparing your order" },
  { key: "ready_for_pickup",  label: "Ready for Collection", hint: "Your items are packed and waiting" },
  { key: "out_for_delivery",  label: "On the Way",           hint: "Rider is heading to your address" },
  { key: "delivered",         label: "Delivered",            hint: "Order complete" },
];

const PICKUP_STEPS = [
  { key: "pending_review",    label: "Order Placed",         hint: "Waiting for pharmacy confirmation" },
  { key: "pharmacy_accepted", label: "Confirmed",            hint: "Pharmacy is preparing your order" },
  { key: "ready_for_pickup",  label: "Ready for Pickup",     hint: "Head to the pharmacy counter" },
  { key: "delivered",         label: "Collected",            hint: "Thank you for your order" },
];

const STATUS_WEIGHTS: Record<string, number> = {
  pending_review: 0, pharmacy_accepted: 1, ready_for_pickup: 2, out_for_delivery: 3, delivered: 4,
};

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const t        = useTranslation();

  const [order, setOrder]           = useState<Order | null>(null);
  const [loading, setLoading]       = useState(true);
  const [delivery, setDelivery]     = useState<BackendDelivery | null>(null);
  const [deliveryQR, setDeliveryQR] = useState<DeliveryQR | null>(null);
  const [qrLoading, setQrLoading]   = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryPhone, setRetryPhone] = useState("");
  const [retryPaymentMethod, setRetryPaymentMethod] = useState<PaymentMethodId>("mtn_momo");
  const PAYMENT_FEE_PCT = 3.8;
  const [reassignOptions, setReassignOptions] = useState<Awaited<ReturnType<typeof ordersService.getReassignmentOptions>> | null>(null);
  const [reassignTick, setReassignTick] = useState(0);
  const authUser = useAuthStore((s) => s.user);

  const awaitingPharmacyConfirm =
    order?.paymentStatus === "paid" && order?.status === "pending_review";

  useEffect(() => {
    if (authUser?.phone && !retryPhone) {
      setRetryPhone(authUser.phone);
    }
  }, [authUser?.phone, retryPhone]);

  const loadOrder = async () => {
    if (!id) return;
    const fresh = await ordersService.getOrderById(id);
    setOrder(fresh);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ordersService.getOrderById(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !order) return;
    if (order.deliveryMethod !== "delivery") return;
    if (order.status === "cancelled") return;
    setQrLoading(true);
    deliveryService.getQrForOrder(id)
      .then(setDeliveryQR)
      .catch(() => setDeliveryQR(null))
      .finally(() => setQrLoading(false));
  }, [id, order?.status, order?.deliveryMethod]);

  useEffect(() => {
    if (!id || !order || !awaitingPharmacyConfirm) {
      setReassignOptions(null);
      return;
    }
    ordersService
      .getReassignmentOptions(id, false)
      .then(setReassignOptions)
      .catch(() => setReassignOptions(null));
  }, [id, awaitingPharmacyConfirm, reassignTick]);

  useEffect(() => {
    if (!order?.partnerResponseDueAt || order.canReassignPharmacy) return;
    const due = parseApiDateTime(order.partnerResponseDueAt)?.getTime();
    if (due == null) return;
    const ms = due - Date.now();
    if (ms <= 0) return;
    const timer = window.setTimeout(() => setReassignTick((n) => n + 1), ms + 500);
    return () => window.clearTimeout(timer);
  }, [order?.partnerResponseDueAt, order?.canReassignPharmacy]);

  const trackableStatuses = useMemo(
    () => new Set(["out_for_delivery", "delivered", "completed"]),
    [],
  );

  useEffect(() => {
    if (!id || !order || order.deliveryMethod !== "delivery") {
      setDelivery(null);
      return;
    }
    if (!trackableStatuses.has(order.status)) {
      setDelivery(null);
      return;
    }

    let cancelled = false;
    const fetchDelivery = () => {
      deliveryService.getDeliveryForOrder(id)
        .then((d) => { if (!cancelled) setDelivery(d); })
        .catch(() => { if (!cancelled) setDelivery(null); });
    };

    fetchDelivery();
    if (order.status !== "out_for_delivery") return;

    const interval = window.setInterval(fetchDelivery, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id, order?.status, order?.deliveryMethod, trackableStatuses]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await ordersService.cancelOrder(order.id);
      await loadOrder();
    } catch {
      alert("Could not cancel. The order may already be in progress.");
    } finally {
      setCancelling(false);
      setShowCancel(false);
    }
  };

  const canRetryPayment =
    order != null &&
    order.status !== "cancelled" &&
    (order.paymentStatus === "failed" || order.paymentStatus === "pending");

  const handleRetryPayment = async () => {
    if (!order) return;
    const phoneReady = retryPaymentMethod === "card" || retryPhone.trim().length >= 9;
    if (!phoneReady) {
      toast.error("Enter a valid mobile number for this payment method.");
      return;
    }

    setRetryingPayment(true);
    try {
      const redirectUrl = `${window.location.origin}/orders/${order.id}?payment_return=1`;
      const init = await paymentsService.initiate(order.id, {
        phone: retryPhone.trim(),
        name: authUser?.name,
        email: authUser?.email,
        redirect_url: redirectUrl,
        payment_method: retryPaymentMethod,
      });

      if (init.checkout_url) {
        window.location.href = init.checkout_url;
        return;
      }

      if (init.payment_status !== "paid") {
        await paymentsService.waitUntilPaid(order.id);
      }

      toast.success("Payment confirmed.");
      await loadOrder();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start payment. Try again.";
      toast.error(message);
    } finally {
      setRetryingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center py-24">
        <div className="w-10 h-10 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center py-24">
        <Package className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t.order_not_found}</p>
        <button onClick={() => router.push("/orders")} className="text-farumasi-600 dark:text-emerald-400 font-medium hover:underline mt-2 block mx-auto text-sm">
          {t.order_back_orders}
        </button>
      </div>
    );
  }

  const isPickup     = order.deliveryMethod === "pickup";
  const isCancelled  = order.status === "cancelled";
  const isDelivered  = order.status === "delivered";
  const isActive     = !isCancelled && !isDelivered;
  // Backend now allows patient cancellation for pending/accepted/preparing (even if paid).
  // ready_for_pickup is cancellable only when not yet paid.
  const canCancel =
    ["pending_review", "pharmacy_accepted"].includes(order.status) ||
    (order.status === "ready_for_pickup" && order.paymentStatus !== "paid");
  const timelineSteps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const activeWeight  = STATUS_WEIGHTS[order.status] ?? -1;

  // Payment breakdown
  const subtotal    = order.subtotal ?? (order.pharmacyPrice ?? 0);
  const deliveryFee = order.deliveryFee ?? 0;
  const total       = subtotal + deliveryFee;
  const orderAmountDue = Math.round(total);
  const retryProcessingFee = orderAmountDue > 0 ? Math.round(orderAmountDue * PAYMENT_FEE_PCT / 100) : 0;
  const retryTotalWithFee = orderAmountDue + retryProcessingFee;
  const retryPhoneReady = retryPaymentMethod === "card" || retryPhone.trim().length >= 9;

  const itemList = order.itemList ?? [];

  const etaMinutes = delivery ? estimateDeliveryEtaMinutes(delivery) : null;
  const pickupCoords = delivery
    ? coordsPair(delivery.pickup_latitude, delivery.pickup_longitude)
    : null;
  const destCoords = delivery
    ? coordsPair(delivery.destination_latitude, delivery.destination_longitude)
    : null;
  const routeProgress = delivery ? deliveryProgress(delivery) : 0.2;
  const switchableCount = (reassignOptions?.options ?? []).filter((o) => o.can_switch !== false).length;
  const reassignDueAt = reassignOptions?.partner_response_due_at ?? order.partnerResponseDueAt;
  const reassignDueMs = reassignDueAt
    ? Math.max(0, (parseApiDateTime(reassignDueAt)?.getTime() ?? 0) - Date.now())
    : null;
  const reassignWaitLabel =
    reassignDueMs != null
      ? `${Math.floor(Math.ceil(reassignDueMs / 1000) / 60)}:${(Math.ceil(reassignDueMs / 1000) % 60).toString().padStart(2, "0")}`
      : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-farumasi-700 dark:hover:text-emerald-400 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.order_back}
      </button>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold text-farumasi-700 dark:text-emerald-300 bg-farumasi-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                {order.orderCode ?? order.id.slice(0, 8).toUpperCase()}
              </span>
              {order.deliveryMethod && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                  isPickup ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
                )}>
                  {isPickup
                    ? <><Building2 className="w-3 h-3" /> Pickup</>
                    : <><Truck className="w-3 h-3" /> Delivery</>}
                </span>
              )}
            </div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{order.pharmacy}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Placed {timeAgo(order.createdAt)} · {formatDateTimeLocal(order.createdAt)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Payment status pill */}
        {order.paymentStatus && (
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
            order.paymentStatus === "paid"
              ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/50"
              : order.paymentStatus === "failed"
              ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50"
              : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
          )}>
            <Banknote className="w-3 h-3" />
            Payment: {order.paymentStatus}
          </span>
        )}
      </div>

      {awaitingPharmacyConfirm && (
        <PharmacySwitchTeaser
          orderId={order.id}
          pharmacyName={order.pharmacy}
          switchEnabled={reassignOptions?.switch_enabled ?? reassignOptions?.can_reassign ?? false}
          optionCount={switchableCount || reassignOptions?.options.length || 0}
          waitLabel={reassignWaitLabel}
        />
      )}

      {/* ── Live tracking map ────────────────────────────────────────── */}
      {order.status === "out_for_delivery" && (
        <div className="rounded-3xl overflow-hidden border border-farumasi-100 mb-4 shadow-sm">
          <div className="bg-farumasi-600 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">{t.order_live}</span>
            </div>
            <div className="flex items-center gap-1.5 text-farumasi-50 text-sm font-bold">
              <Clock className="w-3.5 h-3.5" />
              {etaMinutes != null ? `${etaMinutes} ${t.order_eta_min}` : t.order_live}
            </div>
          </div>
          <TrackingMap
            pharmacyName={order.pharmacy}
            eta={etaMinutes}
            pickup={pickupCoords}
            destination={destCoords}
            progress={routeProgress}
          />
        </div>
      )}

      {/* ── Rider card ───────────────────────────────────────────────── */}
      {order.status === "out_for_delivery" && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-farumasi-100 dark:bg-emerald-950/50 flex items-center justify-center font-bold text-farumasi-700 dark:text-emerald-300 text-base shrink-0">
            {order.assignedDriverName
              ? order.assignedDriverName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "DR"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.assignedDriverName ?? "Your Rider"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Delivery rider</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.assignedDriverPhone ? (
              <a href={`tel:${order.assignedDriverPhone}`}
                className="w-10 h-10 rounded-full bg-farumasi-50 dark:bg-emerald-950/40 border border-farumasi-200 dark:border-emerald-800/50 flex items-center justify-center hover:bg-farumasi-100 dark:hover:bg-emerald-950/60 transition-colors">
                <Phone className="w-4 h-4 text-farumasi-600" />
              </a>
            ) : (
              <button className="w-10 h-10 rounded-full bg-farumasi-50 dark:bg-emerald-950/40 border border-farumasi-200 dark:border-emerald-800/50 flex items-center justify-center opacity-40 cursor-not-allowed">
                <Phone className="w-4 h-4 text-farumasi-600" />
              </button>
            )}
            <button className="w-10 h-10 rounded-full bg-farumasi-50 dark:bg-emerald-950/40 border border-farumasi-200 dark:border-emerald-800/50 flex items-center justify-center hover:bg-farumasi-100 dark:hover:bg-emerald-950/60 transition-colors">
              <MessageCircle className="w-4 h-4 text-farumasi-600" />
            </button>
          </div>
        </div>
      )}

      {/* ── Status timeline ──────────────────────────────────────────── */}
      {!isCancelled ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
            {isPickup ? "Pickup Progress" : t.order_progress}
          </h2>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const weight = STATUS_WEIGHTS[step.key] ?? i;
              const done   = weight <= activeWeight;
              const active = step.key === order.status;
              const last   = i === timelineSteps.length - 1;
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                      done
                        ? "bg-farumasi-600 border-farumasi-600"
                        : active
                        ? "bg-white dark:bg-slate-800 border-farumasi-400 ring-4 ring-farumasi-100 dark:ring-emerald-900/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600",
                    )}>
                      {done
                        ? <CheckCircle className="w-4 h-4 text-white" />
                        : <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">{i + 1}</span>}
                    </div>
                    {!last && (
                      <div className={cn(
                        "w-0.5 flex-1 min-h-[24px] mt-1",
                        done ? "bg-farumasi-400" : "bg-slate-100 dark:bg-slate-700",
                      )} />
                    )}
                  </div>
                  <div className={cn("pb-5 pt-1 min-w-0 flex-1", last && "pb-0")}>
                    <p className={cn(
                      "text-sm font-semibold",
                      active ? "text-farumasi-700 dark:text-emerald-300" : done ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-600",
                    )}>
                      {step.label}
                    </p>
                    {(active || done) && (
                      <p className={cn("text-xs mt-0.5", active ? "text-farumasi-500 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-slate-500")}>
                        {step.hint}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-3xl p-5 mb-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-bold text-sm">Order Cancelled</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">This order was not completed.</p>
          </div>
        </div>
      )}

      {/* ── Access code reminder (pickup / delivery) ─────────────────── */}
      {isActive && order.patientAccessCode && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-3xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Your Access Code</p>
            <p className="text-xl font-extrabold text-amber-900 dark:text-amber-100 tracking-widest font-mono mt-0.5">
              {order.patientAccessCode}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {isPickup ? "Show this code at the pharmacy counter." : "Share with rider on arrival."}
            </p>
          </div>
        </div>
      )}

      {/* ── Pickup directions ─────────────────────────────────────────── */}
      {isPickup && !isCancelled && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            Pharmacy Location
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-farumasi-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-farumasi-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.pharmacy}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Present your access code at the counter</p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(order.pharmacy + " pharmacy Rwanda")}`}
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

      {/* ── Delivery address ──────────────────────────────────────────── */}
      {!isPickup && order.deliveryAddress && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            Delivery Address
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-200">{order.deliveryAddress}</p>
        </div>
      )}

      {/* ── Delivery QR ───────────────────────────────────────────────── */}
      {!isPickup && !isCancelled && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-farumasi-600" />
            Delivery Verification
          </h2>
          {qrLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deliveryQR && (deliveryQR.qrCode || deliveryQR.qrToken) ? (
            <div className="flex flex-col items-center text-center">
              {deliveryQR.qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={deliveryQR.qrCode} alt="Delivery QR code" className="w-44 h-44 object-contain rounded-2xl border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-900 p-2" />
              ) : (
                <div className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-2xl p-4 font-mono text-xs text-slate-700 dark:text-slate-200 break-all">{deliveryQR.qrToken}</div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 max-w-xs">Show this to the rider to confirm you are the correct recipient.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">QR code will appear once a rider is assigned.</p>
          )}
        </div>
      )}

      {/* ── Order items ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-farumasi-600" />
          {t.order_summary}
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-normal">{itemList.length} item{itemList.length !== 1 ? "s" : ""}</span>
        </h2>

        <div className="space-y-1">
          {(itemList.length > 0
            ? itemList
            : order.items.split(",").map((name, i) => ({
                id: String(i), name: name.trim(), quantity: 1,
                sellMode: "pack" as const, unitPrice: 0, totalPrice: 0,
                imageUrl: null, productId: null, productListingId: null,
                dispatchBatchNumber: undefined as string | undefined,
                dispatchExpiryDate: undefined as string | undefined,
                dispatchManufacturer: undefined as string | undefined,
                dispatchCountryOfOrigin: undefined as string | undefined,
                dispatchDosage: undefined as string | undefined,
                dispatchNotes: undefined as string | undefined,
              }))
          ).map((item) => {
            const productHref = item.productId ? `/store/${item.productId}` : null;
            const isPartial   = item.sellMode === "partial";

            const Card = (
              <div className={cn(
                "flex items-center gap-3 p-2.5 rounded-2xl transition-colors",
                productHref ? "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" : "",
              )}>
                {/* Image or placeholder */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isPartial ? (
                      <span className="text-[10px] font-bold bg-farumasi-50 dark:bg-emerald-950/40 text-farumasi-700 dark:text-emerald-300 border border-farumasi-100 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                        Partial · {item.quantity} unit{item.quantity !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {item.quantity} pack{item.quantity !== 1 ? "s" : ""}
                      </span>
                    )}
                    {item.unitPrice > 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        @ {formatPrice(item.unitPrice)}{isPartial ? "/unit" : ""}
                      </span>
                    )}
                  </div>
                    {productHref && (
                      <span className="text-[10px] text-farumasi-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-0.5">
                        View product <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {(item.dispatchBatchNumber || item.dispatchCountryOfOrigin || item.dispatchDosage || item.dispatchNotes) && (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-lg px-2 py-1.5 space-y-0.5">
                        {item.dispatchBatchNumber && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Batch:</span> {item.dispatchBatchNumber}</p>
                        )}
                        {item.dispatchExpiryDate && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Expires:</span>{" "}
                            {new Date(item.dispatchExpiryDate).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        )}
                        {item.dispatchManufacturer && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Manufacturer:</span> {item.dispatchManufacturer}</p>
                        )}
                        {item.dispatchCountryOfOrigin && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Country of origin:</span> {item.dispatchCountryOfOrigin}</p>
                        )}
                        {item.dispatchDosage && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Dosage:</span> {item.dispatchDosage}</p>
                        )}
                        {item.dispatchNotes && (
                          <p><span className="font-semibold text-slate-600 dark:text-slate-300">Notes:</span> {item.dispatchNotes}</p>
                        )}
                      </div>
                    )}
                  </div>

                <div className="text-sm font-extrabold text-farumasi-700 dark:text-emerald-300 shrink-0 text-right">
                  {item.totalPrice > 0 ? formatPrice(item.totalPrice) : "—"}
                </div>
              </div>
            );

            return productHref
              ? <Link key={item.id} href={productHref}>{Card}</Link>
              : <div key={item.id}>{Card}</div>;
          })}
        </div>

        {/* Price breakdown */}
        <div className="border-t border-slate-100 dark:border-slate-700 mt-3 pt-3 space-y-1.5">
          {subtotal > 0 && (
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Medicines subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Delivery fee</span>
            <span className={deliveryFee === 0 ? "text-farumasi-600 dark:text-emerald-400 font-medium" : ""}>
              {deliveryFee === 0 ? (isPickup ? "Free (Pickup)" : "Free") : formatPrice(deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-farumasi-700 dark:text-emerald-300 border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
            <span className="text-slate-900 dark:text-slate-100">{t.order_total}</span>
            <span>{order.total}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      {order.notes && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-farumasi-600" />
            Order Notes
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{order.notes}</p>
        </div>
      )}

      {/* ── Pharmacy / seller info ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-farumasi-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-farumasi-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{order.pharmacy}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t.order_location}</p>
        </div>
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(order.pharmacy + " pharmacy Rwanda")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-xl bg-farumasi-50 dark:bg-emerald-950/40 hover:bg-farumasi-100 dark:hover:bg-emerald-950/60 border border-farumasi-100 dark:border-emerald-800/50 flex items-center justify-center transition-colors"
          title="View on map"
        >
          <MapPin className="w-4 h-4 text-farumasi-600" />
        </a>
      </div>

      {/* ── Retry payment ───────────────────────────────────────────── */}
      {canRetryPayment && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-amber-200 dark:border-amber-800/50 shadow-sm p-5 mb-4">
          <div className="flex items-start gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment required</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete payment to confirm your order.
              </p>
            </div>
          </div>
          <PaymentCheckout
            method={retryPaymentMethod}
            onMethodChange={setRetryPaymentMethod}
            phone={retryPhone}
            onPhoneChange={setRetryPhone}
            feePercent={PAYMENT_FEE_PCT}
            orderSubtotal={orderAmountDue}
            processingFee={retryProcessingFee}
            totalWithFee={retryTotalWithFee}
            formatPrice={formatPrice}
          />
          <button
            onClick={handleRetryPayment}
            disabled={retryingPayment || !retryPhoneReady}
            className="w-full mt-5 flex items-center justify-center gap-2 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            <Banknote className="w-4 h-4" />
            {retryingPayment
              ? "Starting payment…"
              : `Pay now · ${formatPrice(retryTotalWithFee)}`}
          </button>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {canRetryPayment && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            You will be redirected to Pesapal to complete card payment securely.
          </p>
        )}

        {/* Reorder (past / delivered orders) */}
        {isDelivered && itemList.length > 0 && (
          <Link
            href="/store"
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-farumasi-600 text-farumasi-700 dark:text-emerald-300 font-bold text-sm hover:bg-farumasi-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reorder — Browse Same Products
          </Link>
        )}

        {/* Cancel (active orders only) */}
        {canCancel && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-sm transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Cancel Order
          </button>
        )}
      </div>

      {/* ── Inline cancel confirmation ───────────────────────────────── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cancelling && setShowCancel(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl z-10 p-6 space-y-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Cancel this order?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {order.orderCode ?? order.id.slice(0, 8).toUpperCase()} · {order.pharmacy}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
                className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
