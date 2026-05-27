"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ordersService } from "@/lib/services/orders.service";
import { deliveryService } from "@/lib/services/delivery.service";
import type { Order, DeliveryQR } from "@/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/lib/translations";
import { ArrowLeft, MapPin, Phone, MessageCircle, Package, Store, CheckCircle, Truck, Clock, QrCode, Navigation, ExternalLink, Building2 } from "lucide-react";

// Dynamically import the Leaflet map — must be client-only, no SSR
const TrackingMap = dynamic(
  () => import("@/components/shared/tracking-map"),
  { ssr: false, loading: () => <div className="h-[280px] bg-farumasi-50 animate-pulse rounded-b-3xl" /> }
);

// Kigali waypoints now live in tracking-map.tsx — kept for reference

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslation();

  const STATUS_STEPS = [
    { key: "pending",          label: t.order_step_placed },
    { key: "confirmed",        label: t.order_step_confirmed },
    { key: "preparing",        label: t.order_step_preparing },
    { key: "ready_for_pickup", label: t.order_step_ready },
    { key: "out_for_delivery", label: t.order_step_delivering },
    { key: "delivered",        label: t.order_step_delivered },
  ];

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(18);
  const [deliveryQR, setDeliveryQR] = useState<DeliveryQR | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ordersService.getOrderById(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Phase 11.3: fetch delivery QR for delivery-method orders.
  useEffect(() => {
    if (!id || !order) return;
    if (order.deliveryMethod !== "delivery") return;
    if (order.status === "cancelled") return;
    setQrLoading(true);
    deliveryService.getQrForOrder(id)
      .then(setDeliveryQR)
      .catch(() => setDeliveryQR(null))
      .finally(() => setQrLoading(false));
  }, [id, order]);

  useEffect(() => {
    if (order?.status !== "out_for_delivery") return;
    const etaTimer = setInterval(() => {
      setEta((prev) => Math.max(prev - 1, 1));
    }, 60000);
    return () => clearInterval(etaTimer);
  }, [order?.status]);

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
        <p className="text-slate-500">{t.order_not_found}</p>
        <button onClick={() => router.push("/orders")} className="text-farumasi-600 font-medium hover:underline mt-2 block mx-auto">
          {t.order_back_orders}
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  const isPickup = order.deliveryMethod === "pickup";
  const PICKUP_STEPS = [
    { key: "pending_review",    label: "Order Placed" },
    { key: "pharmacy_accepted", label: "Accepted by Pharmacy" },
    { key: "ready_for_pickup",  label: "Ready for Pickup" },
    { key: "delivered",         label: "Collected" },
  ];
  const timelineSteps    = isPickup ? PICKUP_STEPS : STATUS_STEPS;
  const pickupStepIndex  = timelineSteps.findIndex((s) => s.key === order.status);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.order_back}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Order #{order.orderCode ?? order.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{order.pharmacy} · {order.date}</p>
          {order.paymentStatus && (
            <span
              className={cn(
                "inline-flex items-center gap-1 mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                order.paymentStatus === "paid"
                  ? "bg-green-50 text-green-700 border-green-100"
                  : order.paymentStatus === "failed"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : "bg-amber-50 text-amber-700 border-amber-100",
              )}
            >
              Payment: {order.paymentStatus}
            </span>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Map — real Leaflet OSM map when out_for_delivery */}
      {order.status === "out_for_delivery" && (
        <div className="rounded-3xl overflow-hidden border border-farumasi-100 mb-6 shadow-sm">
          {/* Live indicator bar */}
          <div className="bg-farumasi-600 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">{t.order_live}</span>
            </div>
            <div className="flex items-center gap-1.5 text-farumasi-50 text-sm font-bold">
              <Clock className="w-3.5 h-3.5" />
              {eta} {t.order_eta_min}
            </div>
          </div>
          {/* Real OSM map */}
          <TrackingMap pharmacyName={order.pharmacy} eta={eta} />
        </div>
      )}

      {/* Delivery driver (only when out for delivery) */}
      {order.status === "out_for_delivery" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-base shrink-0">
            JK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Jean Kayitare</p>
            <p className="text-xs text-slate-500">{t.order_driver}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
              <Phone className="w-4 h-4 text-farumasi-600" />
            </button>
            <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
              <MessageCircle className="w-4 h-4 text-farumasi-600" />
            </button>
          </div>
        </div>
      )}

      {/* Status timeline */}
      {!isCancelled ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">{isPickup ? "Pickup Progress" : t.order_progress}</h2>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const activeIdx = isPickup ? pickupStepIndex : currentStepIndex;
              const done   = i <= activeIdx;
              const active = i === activeIdx;
              const last = i === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-3">
                  {/* Line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 border-2 transition-all",
                      done ? "bg-farumasi-600 border-farumasi-600" : "bg-white border-slate-200"
                    )}>
                      {done ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="text-slate-300 text-xs">{i + 1}</span>}
                    </div>
                    {!last && (
                      <div className={cn("w-0.5 flex-1 min-h-[24px] mt-1", done && i < currentStepIndex ? "bg-farumasi-500" : "bg-slate-100")} />
                    )}
                  </div>
                  {/* Label */}
                  <div className={cn("pb-5 pt-1 min-w-0 flex-1", last && "pb-0")}>
                    <p className={cn("text-sm font-semibold", active ? "text-farumasi-700" : done ? "text-slate-700" : "text-slate-400")}>
                      {step.label}
                    </p>
                    {active && <p className="text-xs text-farumasi-600 mt-0.5 font-medium">{t.order_current}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-5 mb-5 text-center">
          <p className="text-red-600 font-bold text-base">{order.status === "cancelled" ? t.order_cancelled : t.order_failed}</p>
          <p className="text-sm text-red-500 mt-1">{t.order_not_completed}</p>
        </div>
      )}

      {/* Pickup: location & directions only */}
      {isPickup && order.status !== "cancelled" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            Location &amp; Directions
          </h2>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-farumasi-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{order.pharmacy}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tap below to open in Maps</p>
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

      {/* Delivery QR (delivery orders only) */}
      {!isPickup && order.status !== "cancelled" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-farumasi-600" />
            Delivery QR
          </h2>
          {qrLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deliveryQR && (deliveryQR.qrCode || deliveryQR.qrToken) ? (
            <div className="flex flex-col items-center text-center">
              {deliveryQR.qrCode ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={deliveryQR.qrCode}
                  alt="Delivery QR code"
                  className="w-48 h-48 object-contain rounded-2xl border border-slate-100 bg-white p-2"
                />
              ) : (
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-xs text-slate-700 break-all">
                  {deliveryQR.qrToken}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-3 max-w-xs">
                Show this QR code to the rider to confirm delivery to the right person.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">
              Delivery QR will appear once your delivery is assigned.
            </p>
          )}
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-farumasi-600" />
          {t.order_summary}
        </h2>
        <div className="space-y-2">
          {order.items.split(",").map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">{item.trim()}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span className="text-sm font-bold text-slate-900">{t.order_total}</span>
            <span className="text-base font-extrabold text-farumasi-700">{order.total}</span>
          </div>
        </div>
      </div>

      {/* Pharmacy info */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-farumasi-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{order.pharmacy}</p>
          <p className="text-xs text-slate-500">{t.order_location}</p>
        </div>
      </div>
    </div>
  );
}
