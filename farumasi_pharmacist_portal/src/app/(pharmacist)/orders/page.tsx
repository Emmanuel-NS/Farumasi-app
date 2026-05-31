"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { toast } from "sonner";
import {
  ShoppingBag, ChevronDown, ChevronUp, MapPin, CreditCard,
  Truck, PackageCheck, Clock, UserCheck, CircleDot, RefreshCw,
} from "lucide-react";
import type { OrderStatus } from "@/types";

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all",               label: "All" },
  { value: "pending",           label: "Pending" },
  { value: "accepted",          label: "Accepted" },
  { value: "rejected",          label: "Rejected" },
  { value: "preparing",         label: "Preparing" },
  { value: "ready_for_pickup",  label: "Ready for Pickup" },
  { value: "out_for_delivery",  label: "Out for Delivery" },
  { value: "delivered",         label: "Delivered" },
  { value: "cancelled",         label: "Cancelled" },
];

/* Maps backend order_status to timeline step index (0-based) */
const STATUS_STEP: Partial<Record<string, number>> = {
  pending:           0,
  accepted:          1,
  rejected:          5,
  preparing:         2,
  ready_for_pickup:  3,
  out_for_delivery:  4,
  delivered:         5,
  completed:         5,
  cancelled:         5,
  failed:            5,
};

const TIMELINE_STEPS = [
  { icon: CircleDot,    label: "Order Received",      desc: "New order from patient" },
  { icon: UserCheck,    label: "Accepted",             desc: "Pharmacist confirmed order" },
  { icon: PackageCheck, label: "Preparing",            desc: "Medicines being prepared" },
  { icon: CreditCard,   label: "Ready for Pickup",     desc: "Order ready / awaiting rider" },
  { icon: Truck,        label: "Out for Delivery",     desc: "Rider en route to patient" },
  { icon: Clock,        label: "Delivered",            desc: "Order received by patient" },
];

export default function OrdersPage() {
  const [filter, setFilter]   = useState<"all" | OrderStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders]    = useState<BackendOrder[]>([]);
  const [loading, setLoading]  = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = filter !== "all" ? { status: filter, limit: 50 } : { limit: 50 };
      const res = await ordersService.getPharmacyOrders(params);
      setOrders(res.items);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (status === 404) {
        setLoadError(typeof detail === "string" ? detail : "Your account is not linked to a pharmacy. Contact your administrator.");
      } else {
        toast.error("Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds so new patient orders appear without manual reload
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = orders;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and fulfill patient medicine orders</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              filter === f.value
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-farumasi-200 border-t-farumasi-600 rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading orders…</p>
        </div>
      ) : loadError ? (
        <div className="py-24 flex flex-col items-center text-center">
          <ShoppingBag className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-700 font-semibold mb-1">Account not linked</p>
          <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <ShoppingBag className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expanded === order.id;
            const step       = STATUS_STEP[order.order_status] ?? 0;
            const isCancelled = order.order_status === "cancelled" || order.order_status === "rejected";

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Card header — click to expand */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                  className="w-full text-left p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{order.patient?.user?.full_name ?? "Unknown Patient"}</p>
                      <p className="text-xs text-slate-500">{order.patient?.user?.phone ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.order_status} />
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-50 rounded-2xl px-4 py-2.5 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-0.5">
                        <span className="text-slate-700">
                          {item.product_name}{" "}
                          <span className="text-slate-400">x{item.quantity}</span>
                        </span>
                        <span className="text-slate-600">{formatPrice(item.total_price)} RWF</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-farumasi-700">
                        {formatPrice(order.total_amount)} RWF
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(order.created_at)}{order.payment_method ? ` · ${order.payment_method.replace(/_/g, " ")}` : ""}
                      </p>
                    </div>
                        {order.delivery?.rider?.user?.full_name && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        🚚 {order.delivery.rider.user.full_name}
                      </p>
                    )}
                  </div>
                </button>

                {/* Expandable detail + timeline */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 bg-slate-50/30">
                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                      <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <p className="text-xs text-slate-400 mb-1">Payment method</p>
                        <p className="font-semibold text-slate-700 capitalize">
                          {order.payment_method?.replace(/_/g, " ") ?? "N/A"}
                        </p>
                      </div>
                      <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-farumasi-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Delivery address</p>
                            <p className="font-semibold text-slate-700 text-xs leading-tight">
                              {order.delivery_address ?? "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status timeline */}
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Order Timeline
                    </h3>
                    <div className="space-y-0">
                      {TIMELINE_STEPS.map((s, idx) => {
                        const isCompleted = isCancelled ? false : idx <= step;
                        const isActive    = !isCancelled && idx === step;
                        const isFuture    = !isCompleted;
                        const Icon        = s.icon;

                        /* Last step override for cancelled/rejected */
                        const isRejected = order.order_status === "rejected";
                        const labelText = isCancelled && idx === 5 ? (isRejected ? "Rejected" : "Cancelled") : s.label;
                        const descText  = isCancelled && idx === 5 ? (isRejected ? "Order was rejected" : "Order was cancelled") : s.desc;

                        return (
                          <div key={idx} className="flex items-start gap-3">
                            {/* Dot + connector */}
                            <div className="flex flex-col items-center shrink-0">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                                isActive    ? "bg-farumasi-600 text-white"
                                  : isCompleted ? "bg-farumasi-100 text-farumasi-700"
                                  : isCancelled && idx === 5 ? "bg-red-100 text-red-500"
                                  : "bg-slate-100 text-slate-300"
                              )}>
                                <Icon className="w-3 h-3" />
                              </div>
                              {idx < TIMELINE_STEPS.length - 1 && (
                                <div className={cn(
                                  "w-0.5 h-5",
                                  isCompleted ? "bg-farumasi-200" : "bg-slate-100"
                                )} />
                              )}
                            </div>
                            {/* Label */}
                            <div className="pb-1 pt-1">
                              <p className={cn(
                                "text-sm font-semibold",
                                isActive      ? "text-farumasi-700"
                                  : isCompleted ? "text-slate-700"
                                  : isCancelled && idx === 5 ? "text-red-600"
                                  : "text-slate-300"
                              )}>
                                {labelText}
                                {isActive && (
                                  <span className="ml-2 text-[10px] bg-farumasi-100 text-farumasi-600 px-1.5 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isCompleted || isActive ? "text-slate-400" : "text-slate-200"
                              )}>
                                {descText}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


