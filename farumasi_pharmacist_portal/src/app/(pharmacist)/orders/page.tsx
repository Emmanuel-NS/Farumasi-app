"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { startVisibleInterval } from "@/lib/polling";
import { toast } from "sonner";
import {
  ShoppingBag, ChevronRight, MapPin,
  Truck, PackageCheck, Clock, UserCheck, CircleDot, RefreshCw,
  Check, X, Loader2, Pill, AlertTriangle,
} from "lucide-react";
import type { OrderStatus } from "@/types";

// "cancelled" and "rejected" are intentionally excluded from the main filters —
// they appear on a dedicated "Cancelled" tab.
const CANCELLED_STATUSES = new Set(["cancelled", "rejected", "failed"]);

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "pending",          label: "Pending" },
  { value: "accepted",         label: "Accepted" },
  { value: "preparing",        label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered",        label: "Delivered" },
];

const STATUS_STEP: Partial<Record<string, number>> = {
  pending: 0, accepted: 1, preparing: 2,
  ready_for_pickup: 3, out_for_delivery: 4, delivered: 5,
  completed: 5, cancelled: 5, failed: 5, rejected: 5,
};

const TIMELINE_STEPS = [
  { icon: CircleDot,    label: "Received",         desc: "New order from patient" },
  { icon: UserCheck,    label: "Accepted",          desc: "Pharmacist confirmed" },
  { icon: PackageCheck, label: "Preparing",         desc: "Medicines being packed" },
  { icon: Truck,        label: "Ready / Pickup",    desc: "Awaiting dispatch or patient" },
  { icon: Truck,        label: "Out for Delivery",  desc: "Rider en route" },
  { icon: Clock,        label: "Delivered",         desc: "Received by patient" },
];

export default function OrdersPage() {
  const [mainTab, setMainTab]     = useState<"orders" | "cancelled">("orders");
  const [filter, setFilter]       = useState<"all" | OrderStatus>("all");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [orders, setOrders]       = useState<BackendOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing]       = useState<string | null>(null); // order id being acted on

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      // Always load all orders — we split into tabs in-memory.
      const res = await ordersService.getPharmacyOrders({ limit: 100 });
      setOrders(res.items);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (status === 404) {
        setLoadError(typeof detail === "string" ? detail : "Account not linked to a pharmacy.");
      } else {
        toast.error("Failed to load orders");
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => startVisibleInterval(() => { void load(); }, 60_000), [load]);
  // filter change no longer re-fetches (in-memory split)

  const advanceStatus = async (orderId: string, nextStatus: string) => {
    setActing(orderId);
    try {
      const updated = await ordersService.updateStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
      toast.success(`Order ${nextStatus.replace(/_/g, " ")}`);
    } catch { toast.error("Could not update order"); }
    finally { setActing(null); }
  };

  const pendingCount    = orders.filter((o) => o.order_status === "pending").length;
  const activeOrders    = orders.filter((o) => !CANCELLED_STATUSES.has(o.order_status));
  const cancelledOrders = orders.filter((o) => CANCELLED_STATUSES.has(o.order_status));

  // Apply status filter within the active orders tab
  const filteredActiveOrders = filter === "all"
    ? activeOrders
    : activeOrders.filter((o) => o.order_status === filter);

  const displayOrders = mainTab === "cancelled" ? cancelledOrders : filteredActiveOrders;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and fulfil patient medicine orders</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full animate-pulse">
              {pendingCount} needs action
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main tab row: Orders | Cancelled */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-5">
        {([
          { key: "orders",    label: "Active Orders",    count: activeOrders.length    },
          { key: "cancelled", label: "Cancelled/Rejected", count: cancelledOrders.length },
        ] as const).map(({ key, label, count }) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
              mainTab === key ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {label}
            {count > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                mainTab === key
                  ? key === "cancelled" ? "bg-red-600 text-white" : "bg-farumasi-600 text-white"
                  : "bg-slate-200 text-slate-500"
              )}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Status filters (only on active-orders tab) */}
      <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5", mainTab === "cancelled" && "hidden")}>
        {STATUS_FILTERS.map((f) => {
          const count = f.value !== "all"
            ? activeOrders.filter((o) => o.order_status === f.value).length
            : activeOrders.length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5",
                filter === f.value
                  ? "bg-farumasi-600 text-white border-farumasi-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
              )}>
              {f.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  filter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-farumasi-600 animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading orders…</p>
        </div>
      ) : loadError ? (
        <div className="py-24 flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-amber-300 mb-3" />
          <p className="text-slate-700 font-semibold mb-1">Account not linked</p>
          <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <ShoppingBag className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">
            {mainTab === "cancelled" ? "No cancelled or rejected orders" : "No orders found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayOrders.map((order) => {
            const isExpanded  = expanded === order.id;
            const step        = STATUS_STEP[order.order_status] ?? 0;
            const isPending   = order.order_status === "pending";
            const isCancelled = order.order_status === "cancelled" || order.order_status === "rejected";
            const isActing    = acting === order.id;

            return (
              <div key={order.id}
                className={cn(
                  "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all",
                  isPending ? "border-amber-200" : "border-slate-100"
                )}>

                {/* ── Card header ──────────────────────────────────────────── */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-bold text-slate-400">
                          {order.order_code ? `#${order.order_code}` : `#${order.id.slice(-8).toUpperCase()}`}
                        </p>
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                            Needs Action
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900 truncate">
                        {order.patient?.user?.full_name ?? "Unknown Patient"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.patient?.user?.phone ?? "—"} · {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={order.order_status} />
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-50 rounded-2xl px-4 py-2.5 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-0.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Pill className="w-3 h-3 text-farumasi-400 shrink-0" />
                          <span className="text-slate-700 truncate">{item.product_name}</span>
                          {item.sell_mode === "partial" ? (
                            <span className="shrink-0 text-[10px] font-bold bg-farumasi-100 text-farumasi-700 px-1.5 py-0.5 rounded-full">
                              {item.quantity} units
                            </span>
                          ) : (
                            <span className="shrink-0 text-slate-400 text-xs">×{item.quantity}</span>
                          )}
                        </div>
                        <span className="text-slate-600 shrink-0">{formatPrice(item.total_price)} RWF</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-farumasi-700">
                        {formatPrice(order.total_amount)} RWF
                      </p>
                      {order.delivery_method && (
                        <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1">
                          {order.delivery_method === "delivery"
                            ? <Truck className="w-3 h-3" />
                            : <PackageCheck className="w-3 h-3" />}
                          {order.delivery_method}
                          {order.delivery?.rider?.user?.full_name && (
                            <span className="ml-1">· {order.delivery.rider.user.full_name}</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Accept/Reject for pending orders */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => advanceStatus(order.id, "rejected")}
                            disabled={isActing}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                          <button
                            onClick={() => advanceStatus(order.id, "accepted")}
                            disabled={isActing}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Accept
                          </button>
                        </>
                      )}

                      {/* Details link */}
                      <Link href={`/orders/${order.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-farumasi-600 hover:text-farumasi-700 transition-colors">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {/* Expand toggle for timeline */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : order.id)}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1">
                        {isExpanded ? "▴" : "▾"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Timeline (expandable) ─────────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 bg-slate-50/30">
                    {/* Delivery address */}
                    {order.delivery_address && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-100 rounded-xl px-3 py-2 mb-4">
                        <MapPin className="w-3.5 h-3.5 text-farumasi-600 shrink-0" />
                        {order.delivery_address}
                      </div>
                    )}

                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Timeline</h3>
                    <div className="space-y-0">
                      {TIMELINE_STEPS.map((s, idx) => {
                        const isCompleted = isCancelled ? false : idx <= step;
                        const isActive    = !isCancelled && idx === step;
                        const Icon        = s.icon;
                        const isCancelStep = isCancelled && idx === TIMELINE_STEPS.length - 1;
                        const labelText   = isCancelStep
                          ? (order.order_status === "rejected" ? "Rejected" : "Cancelled")
                          : s.label;

                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
                                isActive      ? "bg-farumasi-600 text-white"
                                  : isCompleted   ? "bg-farumasi-100 text-farumasi-700"
                                  : isCancelStep  ? "bg-red-100 text-red-500"
                                  : "bg-slate-100 text-slate-300"
                              )}>
                                <Icon className="w-3 h-3" />
                              </div>
                              {idx < TIMELINE_STEPS.length - 1 && (
                                <div className={cn("w-0.5 h-4", isCompleted ? "bg-farumasi-200" : "bg-slate-100")} />
                              )}
                            </div>
                            <div className="pb-0.5 pt-0.5">
                              <p className={cn(
                                "text-xs font-semibold",
                                isActive      ? "text-farumasi-700"
                                  : isCompleted   ? "text-slate-700"
                                  : isCancelStep  ? "text-red-600"
                                  : "text-slate-300"
                              )}>
                                {labelText}
                                {isActive && (
                                  <span className="ml-1.5 text-[9px] bg-farumasi-100 text-farumasi-600 px-1.5 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
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
