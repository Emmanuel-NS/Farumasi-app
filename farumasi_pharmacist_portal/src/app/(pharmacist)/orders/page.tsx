"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import {
  ordersService,
  isPrescriptionOrder,
  type BackendOrder,
} from "@/lib/services/orders.service";
import { startVisibleInterval } from "@/lib/polling";
import { toast } from "sonner";
import {
  ShoppingBag, ChevronRight, MapPin, Truck, PackageCheck,
  RefreshCw, Loader2, Pill, AlertTriangle, Eye, Building2, FileText,
} from "lucide-react";
import type { OrderStatus } from "@/types";

const CANCELLED_STATUSES = new Set(["cancelled", "rejected", "failed"]);

type OrderTab = "all" | "prescription" | "partner" | "cancelled";

function isAwaitingConfirmation(o: BackendOrder): boolean {
  return o.order_status === "pending" && o.payment_status === "paid";
}

function fulfillerLabel(order: BackendOrder): string {
  if (order.partner_company?.name) return order.partner_company.name;
  if (order.pharmacy?.name) return order.pharmacy.name;
  return "—";
}

export default function OrdersPage() {
  const [mainTab, setMainTab] = useState<OrderTab>("all");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const offset = append ? orders.length : 0;
      const res = await ordersService.getPharmacyOrders({ offset, limit: 100 });
      setTotal(res.total);
      setOrders((prev) => (append ? [...prev, ...res.items] : res.items));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (!append) {
        if (status === 403 || status === 404) {
          setLoadError(typeof detail === "string" ? detail : "Not allowed to view platform orders.");
        } else {
          toast.error("Failed to load orders");
        }
      } else {
        toast.error("Failed to load more orders");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [orders.length]);

  useEffect(() => { void load(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => startVisibleInterval(() => { void load(false); }, 60_000), [load]);

  const activeOrders = useMemo(
    () => orders.filter((o) => !CANCELLED_STATUSES.has(o.order_status)),
    [orders],
  );
  const awaitingConfirmation = useMemo(
    () => activeOrders.filter(isAwaitingConfirmation),
    [activeOrders],
  );
  const prescriptionOrders = useMemo(
    () => activeOrders.filter((o) => isPrescriptionOrder(o)),
    [activeOrders],
  );
  const partnerOrders = useMemo(
    () => activeOrders.filter((o) => !isPrescriptionOrder(o)),
    [activeOrders],
  );
  const cancelledOrders = useMemo(
    () => orders.filter((o) => CANCELLED_STATUSES.has(o.order_status)),
    [orders],
  );

  const displayOrders =
    mainTab === "all"
      ? activeOrders
      : mainTab === "prescription"
        ? prescriptionOrders
        : mainTab === "partner"
          ? partnerOrders
          : cancelledOrders;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor fulfilment — prescription and partner pharmacy orders (read-only)
          </p>
        </div>
        <button
          onClick={() => void load(false)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {awaitingConfirmation.length > 0 && mainTab !== "cancelled" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-bold">{awaitingConfirmation.length}</span> paid order
          {awaitingConfirmation.length !== 1 ? "s" : ""} awaiting pharmacy/partner confirmation — shown first in the list.
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-5">
        {([
          { key: "all" as const, label: "All active", count: activeOrders.length, icon: ShoppingBag },
          { key: "prescription" as const, label: "Prescription Orders", count: prescriptionOrders.length, icon: FileText },
          { key: "partner" as const, label: "Partner / Store Orders", count: partnerOrders.length, icon: Building2 },
          { key: "cancelled" as const, label: "Cancelled", count: cancelledOrders.length, icon: AlertTriangle },
        ]).map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
              mainTab === key ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  mainTab === key
                    ? key === "cancelled"
                      ? "bg-red-600 text-white"
                      : "bg-farumasi-600 text-white"
                    : "bg-slate-200 text-slate-500",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === "partner" && (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <Eye className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Store orders are fulfilled by partner pharmacies. You can view details and activity here;
          accept/decline is handled in the partner portal.
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-farumasi-600 animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading orders…</p>
        </div>
      ) : loadError ? (
        <div className="py-24 flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-amber-300 mb-3" />
          <p className="text-slate-700 font-semibold mb-1">Cannot load orders</p>
          <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <ShoppingBag className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No orders in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayOrders.map((order) => {
            const isRx = isPrescriptionOrder(order);
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                          isRx
                            ? "bg-violet-100 text-violet-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {isRx ? "Prescription order" : "Partner order"}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {order.order_code ? `#${order.order_code}` : `#${order.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      {isAwaitingConfirmation(order) && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Awaiting confirm
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-900 truncate">
                      {order.patient?.user?.full_name ?? "Unknown Patient"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.patient?.user?.phone ?? "—"} · {formatDate(order.created_at)}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-farumasi-600" />
                      Fulfilled by: <span className="font-semibold">{fulfillerLabel(order)}</span>
                    </p>
                  </div>
                  <StatusBadge status={order.order_status as OrderStatus} />
                </div>

                <div className="bg-slate-50 rounded-2xl px-4 py-2.5 mb-3">
                  {order.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Pill className="w-3 h-3 text-farumasi-400 shrink-0" />
                        <span className="text-slate-700 truncate">{item.product_name}</span>
                        <span className="text-slate-400 text-xs shrink-0">×{item.quantity}</span>
                      </div>
                      <span className="text-slate-600 shrink-0">{formatPrice(item.total_price)} RWF</span>
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <p className="text-[11px] text-slate-400 pt-1">+{order.items.length - 4} more items</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-farumasi-700">
                      {formatPrice(order.total_amount)} RWF
                    </p>
                    {order.delivery_method && (
                      <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1">
                        {order.delivery_method === "delivery" ? (
                          <Truck className="w-3 h-3" />
                        ) : (
                          <PackageCheck className="w-3 h-3" />
                        )}
                        {order.delivery_method}
                      </p>
                    )}
                    {order.delivery_address && (
                      <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        {order.delivery_address}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-farumasi-600 hover:text-farumasi-700 bg-farumasi-50 px-3 py-2 rounded-xl border border-farumasi-100"
                  >
                    View details <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
          {orders.length < total && (
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loadingMore}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:border-farumasi-200 hover:text-farumasi-700"
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </span>
              ) : (
                `Load more (${orders.length} of ${total})`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
