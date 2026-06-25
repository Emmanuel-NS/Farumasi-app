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
import { cn, formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/lib/translations";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Package, Store,
  CheckCircle, Truck, Clock, QrCode, Navigation, ExternalLink,
  Building2, XCircle, ImageOff, Pill, Lock, FileText,
  RotateCcw, ChevronRight, AlertTriangle, Banknote, Receipt,
} from "lucide-react";
import Link from "next/link";

const TrackingMap = dynamic(
  () => import("@/components/shared/tracking-map"),
  { ssr: false, loading: () => <div className="h-[280px] bg-farumasi-50 animate-pulse rounded-b-3xl" /> }
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
  const [retryPaymentMethod, setRetryPaymentMethod] = useState<"mtn_momo" | "airtel_money" | "card">("mtn_momo");
  const [reassignOptions, setReassignOptions] = useState<Awaited<ReturnType<typeof ordersService.getReassignmentOptions>> | null>(null);
  const [showCheaperPharmacies, setShowCheaperPharmacies] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignTick, setReassignTick] = useState(0);
  const authUser = useAuthStore((s) => s.user);

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
    if (!id || !order) return;
    const dueAt = order.partnerResponseDueAt ? new Date(order.partnerResponseDueAt).getTime() : null;
    const eligible =
      order.canReassignPharmacy ||
      (order.paymentStatus === "paid" &&
        order.status === "pending_review" &&
        dueAt != null &&
        Date.now() >= dueAt);
    if (!eligible) {
      setReassignOptions(null);
      return;
    }
    ordersService
      .getReassignmentOptions(id, showCheaperPharmacies)
      .then(setReassignOptions)
      .catch(() => setReassignOptions(null));
  }, [id, order?.canReassignPharmacy, order?.paymentStatus, order?.status, order?.partnerResponseDueAt, showCheaperPharmacies, reassignTick]);

  useEffect(() => {
    if (!order?.partnerResponseDueAt || order.canReassignPharmacy) return;
    const due = new Date(order.partnerResponseDueAt).getTime();
    const ms = due - Date.now();
    if (ms <= 0) return;
    const timer = window.setTimeout(() => setReassignTick((n) => n + 1), ms + 500);
    return () => window.clearTimeout(timer);
  }, [order?.partnerResponseDueAt, order?.canReassignPharmacy]);

  const handleReassign = async (opt: NonNullable<typeof reassignOptions>["options"][number]) => {
    if (!id) return;
    const key = opt.pharmacy_id ?? opt.partner_company_id ?? "";
    setReassigningId(key);
    try {
      const raw = await ordersService.reassignPharmacy(id, {
        pharmacy_id: opt.pharmacy_id ?? undefined,
        partner_company_id: opt.partner_company_id ?? undefined,
        accept_refund_for_difference: opt.requires_refund,
      });
      setOrder(adaptOrder(raw));
      toast.success(`Order moved to ${opt.provider_name}`);
      setReassignOptions(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not change pharmacy";
      toast.error(message);
    } finally {
      setReassigningId(null);
    }
  };

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
    const needsPhone = retryPaymentMethod !== "card";
    const phone = needsPhone
      ? window.prompt(
          retryPaymentMethod === "airtel_money"
            ? "Enter your Airtel Money number:"
            : "Enter your MTN MoMo number:",
          authUser?.phone ?? "",
        )
      : authUser?.phone ?? "";
    if (needsPhone && !phone?.trim()) return;

    setRetryingPayment(true);
    try {
      const redirectUrl = `${window.location.origin}/orders/${order.id}?payment_return=1`;
      const init = await paymentsService.initiatePesapal(order.id, {
        phone: phone?.trim() || undefined,
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
        <Package className="w-16 h-16 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">{t.order_not_found}</p>
        <button onClick={() => router.push("/orders")} className="text-farumasi-600 font-medium hover:underline mt-2 block mx-auto text-sm">
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

  const itemList = order.itemList ?? [];

  const etaMinutes = delivery ? estimateDeliveryEtaMinutes(delivery) : null;
  const pickupCoords = delivery
    ? coordsPair(delivery.pickup_latitude, delivery.pickup_longitude)
    : null;
  const destCoords = delivery
    ? coordsPair(delivery.destination_latitude, delivery.destination_longitude)
    : null;
  const routeProgress = delivery ? deliveryProgress(delivery) : 0.2;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.order_back}
      </button>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold text-farumasi-700 bg-farumasi-50 px-2.5 py-1 rounded-full">
                {order.orderCode ?? order.id.slice(0, 8).toUpperCase()}
              </span>
              {order.deliveryMethod && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                  isPickup ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700",
                )}>
                  {isPickup
                    ? <><Building2 className="w-3 h-3" /> Pickup</>
                    : <><Truck className="w-3 h-3" /> Delivery</>}
                </span>
              )}
            </div>
            <p className="text-lg font-extrabold text-slate-900">{order.pharmacy}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {order.date}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Payment status pill */}
        {order.paymentStatus && (
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
            order.paymentStatus === "paid"
              ? "bg-green-50 text-green-700 border-green-100"
              : order.paymentStatus === "failed"
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-amber-50 text-amber-700 border-amber-100",
          )}>
            <Banknote className="w-3 h-3" />
            Payment: {order.paymentStatus}
          </span>
        )}
      </div>

      {/* Pharmacy slow to confirm — reassignment after 10 min */}
      {reassignOptions?.can_reassign && reassignOptions.options.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-amber-900">Choose another pharmacy</h2>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your payment of {formatPrice(reassignOptions.amount_paid)} is confirmed, but{" "}
                {order.pharmacy} has not accepted within 10 minutes. Pick another partner at the
                same price — no extra payment required.
              </p>
              <label className="flex items-center gap-2 mt-3 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCheaperPharmacies}
                  onChange={(e) => setShowCheaperPharmacies(e.target.checked)}
                  className="rounded border-amber-300"
                />
                Show cheaper pharmacies (refund difference)
              </label>
              <div className="mt-3 space-y-2">
                {reassignOptions.options.map((opt) => {
                  const key = opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={reassigningId != null}
                      onClick={() => handleReassign(opt)}
                      className="w-full text-left bg-white border border-amber-100 rounded-2xl px-4 py-3 hover:border-farumasi-300 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{opt.provider_name}</span>
                        <span className="text-sm font-extrabold text-farumasi-700">
                          {formatPrice(opt.estimated_total)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Medicines {formatPrice(opt.estimated_subtotal)} · Delivery {formatPrice(opt.delivery_fee)}
                        {opt.requires_refund && (
                          <span className="text-amber-700 font-medium">
                            {" "}· Refund {formatPrice(opt.refund_amount)}
                          </span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-base shrink-0">
            {order.assignedDriverName
              ? order.assignedDriverName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "DR"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{order.assignedDriverName ?? "Your Rider"}</p>
            <p className="text-xs text-slate-400">Delivery rider</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.assignedDriverPhone ? (
              <a href={`tel:${order.assignedDriverPhone}`}
                className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
                <Phone className="w-4 h-4 text-farumasi-600" />
              </a>
            ) : (
              <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center opacity-40 cursor-not-allowed">
                <Phone className="w-4 h-4 text-farumasi-600" />
              </button>
            )}
            <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
              <MessageCircle className="w-4 h-4 text-farumasi-600" />
            </button>
          </div>
        </div>
      )}

      {/* ── Status timeline ──────────────────────────────────────────── */}
      {!isCancelled ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-4">
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
                        ? "bg-white border-farumasi-400 ring-4 ring-farumasi-100"
                        : "bg-white border-slate-200",
                    )}>
                      {done
                        ? <CheckCircle className="w-4 h-4 text-white" />
                        : <span className="text-slate-300 text-xs font-bold">{i + 1}</span>}
                    </div>
                    {!last && (
                      <div className={cn(
                        "w-0.5 flex-1 min-h-[24px] mt-1",
                        done ? "bg-farumasi-400" : "bg-slate-100",
                      )} />
                    )}
                  </div>
                  <div className={cn("pb-5 pt-1 min-w-0 flex-1", last && "pb-0")}>
                    <p className={cn(
                      "text-sm font-semibold",
                      active ? "text-farumasi-700" : done ? "text-slate-700" : "text-slate-300",
                    )}>
                      {step.label}
                    </p>
                    {(active || done) && (
                      <p className={cn("text-xs mt-0.5", active ? "text-farumasi-500 font-medium" : "text-slate-400")}>
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
        <div className="bg-red-50 border border-red-100 rounded-3xl p-5 mb-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <p className="text-red-700 font-bold text-sm">Order Cancelled</p>
            <p className="text-xs text-red-500 mt-0.5">This order was not completed.</p>
          </div>
        </div>
      )}

      {/* ── Access code reminder (pickup / delivery) ─────────────────── */}
      {isActive && order.patientAccessCode && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Your Access Code</p>
            <p className="text-xl font-extrabold text-amber-900 tracking-widest font-mono mt-0.5">
              {order.patientAccessCode}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {isPickup ? "Show this code at the pharmacy counter." : "Share with rider on arrival."}
            </p>
          </div>
        </div>
      )}

      {/* ── Pickup directions ─────────────────────────────────────────── */}
      {isPickup && !isCancelled && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            Pharmacy Location
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-farumasi-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{order.pharmacy}</p>
              <p className="text-xs text-slate-400">Present your access code at the counter</p>
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            Delivery Address
          </h2>
          <p className="text-sm text-slate-700">{order.deliveryAddress}</p>
        </div>
      )}

      {/* ── Delivery QR ───────────────────────────────────────────────── */}
      {!isPickup && !isCancelled && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
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
                <img src={deliveryQR.qrCode} alt="Delivery QR code" className="w-44 h-44 object-contain rounded-2xl border border-slate-100 bg-white p-2" />
              ) : (
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-xs text-slate-700 break-all">{deliveryQR.qrToken}</div>
              )}
              <p className="text-xs text-slate-500 mt-3 max-w-xs">Show this to the rider to confirm you are the correct recipient.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">QR code will appear once a rider is assigned.</p>
          )}
        </div>
      )}

      {/* ── Order items ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-farumasi-600" />
          {t.order_summary}
          <span className="ml-auto text-xs text-slate-400 font-normal">{itemList.length} item{itemList.length !== 1 ? "s" : ""}</span>
        </h2>

        <div className="space-y-1">
          {(itemList.length > 0
            ? itemList
            : order.items.split(",").map((name, i) => ({
                id: String(i), name: name.trim(), quantity: 1,
                sellMode: "pack" as const, unitPrice: 0, totalPrice: 0,
                imageUrl: null, productId: null, productListingId: null,
              }))
          ).map((item) => {
            const productHref = item.productId ? `/store/${item.productId}` : null;
            const isPartial   = item.sellMode === "partial";

            const Card = (
              <div className={cn(
                "flex items-center gap-3 p-2.5 rounded-2xl transition-colors",
                productHref ? "hover:bg-slate-50 cursor-pointer" : "",
              )}>
                {/* Image or placeholder */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isPartial ? (
                      <span className="text-[10px] font-bold bg-farumasi-50 text-farumasi-700 border border-farumasi-100 px-1.5 py-0.5 rounded-full">
                        Partial · {item.quantity} unit{item.quantity !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {item.quantity} pack{item.quantity !== 1 ? "s" : ""}
                      </span>
                    )}
                    {item.unitPrice > 0 && (
                      <span className="text-[10px] text-slate-400">
                        @ {formatPrice(item.unitPrice)}{isPartial ? "/unit" : ""}
                      </span>
                    )}
                  </div>
                    {productHref && (
                      <span className="text-[10px] text-farumasi-600 font-semibold mt-0.5 flex items-center gap-0.5">
                        View product <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {item.dispatchBatchNumber && (
                      <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 space-y-0.5">
                        <p><span className="font-semibold text-slate-600">Batch:</span> {item.dispatchBatchNumber}</p>
                        {item.dispatchExpiryDate && (
                          <p><span className="font-semibold text-slate-600">Expires:</span>{" "}
                            {new Date(item.dispatchExpiryDate).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        )}
                        {item.dispatchManufacturer && (
                          <p><span className="font-semibold text-slate-600">Manufacturer:</span> {item.dispatchManufacturer}</p>
                        )}
                      </div>
                    )}
                  </div>

                <div className="text-sm font-extrabold text-farumasi-700 shrink-0 text-right">
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
        <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5">
          {subtotal > 0 && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Medicines subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-500">
            <span>Delivery fee</span>
            <span className={deliveryFee === 0 ? "text-farumasi-600 font-medium" : ""}>
              {deliveryFee === 0 ? (isPickup ? "Free (Pickup)" : "Free") : formatPrice(deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-farumasi-700 border-t border-slate-100 pt-2 mt-2">
            <span className="text-slate-900">{t.order_total}</span>
            <span>{order.total}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      {order.notes && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-farumasi-600" />
            Order Notes
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">{order.notes}</p>
        </div>
      )}

      {/* ── Pharmacy / seller info ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-farumasi-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{order.pharmacy}</p>
          <p className="text-xs text-slate-400">{t.order_location}</p>
        </div>
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(order.pharmacy + " pharmacy Rwanda")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-xl bg-farumasi-50 hover:bg-farumasi-100 border border-farumasi-100 flex items-center justify-center transition-colors"
          title="View on map"
        >
          <MapPin className="w-4 h-4 text-farumasi-600" />
        </a>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {canRetryPayment && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "mtn_momo" as const, label: "MTN" },
                { id: "airtel_money" as const, label: "Airtel" },
                { id: "card" as const, label: "Card" },
              ]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRetryPaymentMethod(m.id)}
                  className={cn(
                    "h-10 rounded-xl border text-xs font-bold",
                    retryPaymentMethod === m.id
                      ? "border-farumasi-500 bg-farumasi-50 text-farumasi-800"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRetryPayment}
              disabled={retryingPayment}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              <Banknote className="w-4 h-4" />
              {retryingPayment ? "Starting payment…" : "Try payment again"}
            </button>
          </div>
        )}

        {/* Reorder (past / delivered orders) */}
        {isDelivered && itemList.length > 0 && (
          <Link
            href="/store"
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-farumasi-600 text-farumasi-700 font-bold text-sm hover:bg-farumasi-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reorder — Browse Same Products
          </Link>
        )}

        {/* Cancel (active orders only) */}
        {canCancel && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-colors"
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
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Cancel this order?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.orderCode ?? order.id.slice(0, 8).toUpperCase()} · {order.pharmacy}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
                className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
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
