"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Banknote,
  Building2,
  CheckCircle,
  Clock,
  Phone,
  Truck,
  XCircle,
} from "lucide-react";
import type { BackendOrder } from "@/lib/services/orders.service";
import {
  deliveryService,
  coordsPair,
  deliveryProgress,
  estimateDeliveryEtaMinutes,
  type BackendDelivery,
} from "@/lib/services/delivery.service";
import { startVisibleInterval } from "@/lib/polling";
import { cn } from "@/lib/utils";
import {
  CANCELLED_ORDER_STATUSES,
  DELIVERY_STATUS_LABELS,
  DELIVERY_TRACKING_STEPS,
  normalizeTrackingStatus,
  PICKUP_TRACKING_STEPS,
  TRACKING_STATUS_WEIGHTS,
} from "@/lib/order-tracking";

const TrackingMap = dynamic(() => import("@/components/shared/tracking-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] bg-slate-100 animate-pulse flex items-center justify-center text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

const DELIVERY_FETCH_STATUSES = new Set([
  "accepted",
  "preparing",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
]);

interface Props {
  order: BackendOrder;
  fulfillerName: string;
}

export function OrderProgressTracker({ order, fulfillerName }: Props) {
  const [delivery, setDelivery] = useState<BackendDelivery | null>(null);

  const isPickup = (order.delivery_method ?? "delivery") === "pickup";
  const rawStatus = order.order_status ?? order.status;
  const trackingStatus = normalizeTrackingStatus(rawStatus);
  const isCancelled = CANCELLED_ORDER_STATUSES.has(rawStatus.toLowerCase());
  const isDelivered = ["delivered", "completed"].includes(rawStatus.toLowerCase());
  const isOutForDelivery = rawStatus.toLowerCase() === "out_for_delivery";

  const timelineSteps = isPickup ? PICKUP_TRACKING_STEPS : DELIVERY_TRACKING_STEPS;
  const activeWeight = TRACKING_STATUS_WEIGHTS[trackingStatus] ?? -1;

  const shouldFetchDelivery =
    !isPickup && DELIVERY_FETCH_STATUSES.has(rawStatus.toLowerCase());

  useEffect(() => {
    if (!shouldFetchDelivery) {
      setDelivery(null);
      return;
    }

    let cancelled = false;
    const fetchDelivery = () => {
      deliveryService
        .getDeliveryForOrder(order.id)
        .then((d) => {
          if (!cancelled) setDelivery(d);
        })
        .catch(() => {
          if (!cancelled) setDelivery(null);
        });
    };

    fetchDelivery();
    if (!isOutForDelivery) return () => { cancelled = true; };

    const stop = startVisibleInterval(fetchDelivery, 12_000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [order.id, rawStatus, shouldFetchDelivery, isOutForDelivery]);

  const riderName =
    delivery?.rider?.user?.full_name ??
    order.delivery?.rider?.user?.full_name ??
    null;
  const riderPhone = delivery?.rider?.user?.phone ?? null;

  const etaMinutes = delivery ? estimateDeliveryEtaMinutes(delivery) : null;
  const pickupCoords = delivery
    ? coordsPair(delivery.pickup_latitude, delivery.pickup_longitude)
    : null;
  const destCoords = delivery
    ? coordsPair(delivery.destination_latitude, delivery.destination_longitude)
    : null;
  const routeProgress = delivery ? deliveryProgress(delivery) : 0.2;

  const deliveryStatusLabel = useMemo(() => {
    const status = delivery?.status ?? order.delivery?.status;
    if (!status) return null;
    return DELIVERY_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  }, [delivery?.status, order.delivery?.status]);

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex items-center gap-3">
        <XCircle className="w-6 h-6 text-red-400 shrink-0" />
        <div>
          <p className="text-red-700 font-bold text-sm">Order cancelled</p>
          <p className="text-xs text-red-500 mt-0.5">This order was not completed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
            isPickup
              ? "bg-violet-100 text-violet-700"
              : "bg-sky-100 text-sky-700",
          )}
        >
          {isPickup ? (
            <>
              <Building2 className="w-3 h-3" /> Pickup
            </>
          ) : (
            <>
              <Truck className="w-3 h-3" /> Delivery
            </>
          )}
        </span>
        {order.payment_status && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
              order.payment_status === "paid"
                ? "bg-green-50 text-green-700 border-green-100"
                : order.payment_status === "failed"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : "bg-amber-50 text-amber-700 border-amber-100",
            )}
          >
            <Banknote className="w-3 h-3" />
            Payment: {order.payment_status}
          </span>
        )}
        {deliveryStatusLabel && !isPickup && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-farumasi-50 text-farumasi-700 border border-farumasi-100">
            {deliveryStatusLabel}
          </span>
        )}
      </div>

      {isOutForDelivery && !isPickup && (
        <div className="rounded-3xl overflow-hidden border border-farumasi-100 shadow-sm">
          <div className="bg-farumasi-600 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                Live tracking
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-farumasi-50 text-sm font-bold">
              <Clock className="w-3.5 h-3.5" />
              {etaMinutes != null ? `~${etaMinutes} min ETA` : "In progress"}
            </div>
          </div>
          <TrackingMap
            pharmacyName={fulfillerName}
            eta={etaMinutes}
            pickup={pickupCoords}
            destination={destCoords}
            progress={routeProgress}
          />
        </div>
      )}

      {(isOutForDelivery || riderName) && !isPickup && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-base shrink-0">
            {riderName
              ? riderName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "—"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">
              {riderName ?? "Rider not assigned yet"}
            </p>
            <p className="text-xs text-slate-500">Delivery rider</p>
          </div>
          {riderPhone && (
            <a
              href={`tel:${riderPhone}`}
              className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors"
            >
              <Phone className="w-4 h-4 text-farumasi-600" />
            </a>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">
          {isPickup ? "Pickup progress" : "Order progress"}
        </h2>
        <div className="space-y-0">
          {timelineSteps.map((step, i) => {
            const weight = TRACKING_STATUS_WEIGHTS[step.key] ?? i;
            const done = weight <= activeWeight;
            const active = step.key === trackingStatus && !isDelivered;
            const last = i === timelineSteps.length - 1;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                      done
                        ? "bg-farumasi-600 border-farumasi-600"
                        : active
                          ? "bg-white border-farumasi-400 ring-4 ring-farumasi-100"
                          : "bg-white border-slate-200",
                    )}
                  >
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-slate-300 text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  {!last && (
                    <div
                      className={cn(
                        "w-0.5 flex-1 min-h-[24px] mt-1",
                        done ? "bg-farumasi-400" : "bg-slate-100",
                      )}
                    />
                  )}
                </div>
                <div className={cn("pb-5 pt-1 min-w-0 flex-1", last && "pb-0")}>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      active
                        ? "text-farumasi-700"
                        : done
                          ? "text-slate-700"
                          : "text-slate-300",
                    )}
                  >
                    {step.label}
                  </p>
                  {(active || done) && (
                    <p
                      className={cn(
                        "text-xs mt-0.5",
                        active ? "text-farumasi-500 font-medium" : "text-slate-400",
                      )}
                    >
                      {step.hint}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
