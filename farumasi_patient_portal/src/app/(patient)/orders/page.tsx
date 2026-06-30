"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ordersService } from "@/lib/services/orders.service";
import { adaptOrder } from "@/lib/services/orders.service";
import { cn, formatPrice, timeAgo, parseApiDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { GuestGate } from "@/components/shared/guest-gate";
import { PinGate } from "@/components/shared/pin-gate";
import { useTranslation } from "@/lib/translations";
import {
  Package, ChevronRight, Clock, Store, XCircle,
  RefreshCw, Truck, Building2, Pill,
  CheckCircle2, Trash2, Zap,
} from "lucide-react";
import { PharmacyReassignmentBadge } from "@/components/orders/pharmacy-reassignment-panel";
import type { Order } from "@/types";

const ACTIVE_STATUSES = new Set([
  "pending_review", "pharmacy_accepted", "ready_for_pickup", "out_for_delivery",
]);

const DELIVERY_LABELS: Record<string, string> = {
  delivery: "Delivery",
  pickup:   "Pickup",
};

const ARCHIVE_KEY = "farumasi:archived_orders";

function loadArchived(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveArchived(ids: Set<string>) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...ids]));
}

const CANCELLED_STATUSES = new Set(["cancelled", "rejected", "failed"]);

export default function OrdersPage() {
  const [tab, setTab]             = useState<"active" | "past" | "cancelled">("active");
  const [orders, setOrders]       = useState<Order[]>([]);
  const [archived, setArchived]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = useTranslation();

  useEffect(() => { setArchived(loadArchived()); }, []);

  const archiveOrder = (id: string) => {
    setArchived((prev) => {
      const next = new Set([...prev, id]);
      saveArchived(next);
      return next;
    });
  };

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await ordersService.getMyOrders(0, 50);
      setOrders(res.items.map(adaptOrder));
      setLoadError(false);
    } catch { setLoadError(true); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeOrders    = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const cancelledOrders = orders.filter((o) => CANCELLED_STATUSES.has(o.status) && !archived.has(o.id));
  const pastOrders      = orders.filter((o) =>
    !ACTIVE_STATUSES.has(o.status) && !CANCELLED_STATUSES.has(o.status) && !archived.has(o.id)
  );

  return (
    <GuestGate feature="your orders">
      <PinGate feature="orders">
        <div className="flex flex-col h-full min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.orders_title}</h1>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-farumasi-600 dark:hover:text-emerald-400 hover:bg-farumasi-50 dark:hover:bg-slate-700 transition-colors"
              title="Refresh orders"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
            {(["active", "past", "cancelled"] as const).map((tabKey) => {
              const count = tabKey === "active" ? activeOrders.length : tabKey === "past" ? pastOrders.length : cancelledOrders.length;
              return (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={cn(
                    "flex-1 py-3 text-sm font-semibold transition-colors relative flex items-center justify-center gap-1.5",
                    tab === tabKey
                      ? "text-farumasi-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  )}
                >
                  {tabKey === "active" ? t.orders_active : tabKey === "past" ? t.orders_past : "Cancelled"}
                  {count > 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      tab === tabKey
                        ? "bg-farumasi-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    )}>
                      {count}
                    </span>
                  )}
                  {tab === tabKey && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-farumasi-600 dark:bg-emerald-500 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="space-y-3 max-w-3xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 animate-pulse">
                    <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-700 rounded mb-3" />
                    <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 max-w-sm mx-auto text-center">
                <span className="text-4xl">⚠️</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">Couldn&apos;t load orders</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Check your connection and try again.</p>
                <button onClick={() => load()} className="mt-2 px-5 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 transition-colors">Retry</button>
              </div>
            ) : tab === "active" ? (
              activeOrders.length === 0 ? (
                <EmptyOrders message={t.orders_no_active} />
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {activeOrders.map((order) => (
                    <ActiveOrderCard key={order.id} order={order} />
                  ))}
                  
                </div>
              )
            ) : tab === "past" ? (
              pastOrders.length === 0 ? (
                <EmptyOrders message={t.orders_no_past} />
              ) : (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {pastOrders.map((order) => <PastOrderCard key={order.id} order={order} onArchive={() => archiveOrder(order.id)} />)}
                </div>
              )
            ) : (
              /* Cancelled tab */
              cancelledOrders.length === 0 ? (
                <EmptyOrders message="No cancelled orders" />
              ) : (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {cancelledOrders.map((order) => (
                    <PastOrderCard key={order.id} order={order} onArchive={() => archiveOrder(order.id)} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </PinGate>
    </GuestGate>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  const t = useTranslation();
  const router = useRouter();
  const awaitingPharmacy =
    order.paymentStatus === "paid" && order.status === "pending_review";
  const dueMs =
    order.paymentStatus === "paid" && order.partnerResponseDueAt
      ? parseApiDateTime(order.partnerResponseDueAt)?.getTime() ?? null
      : null;
  const waitMs = dueMs != null ? Math.max(0, dueMs - Date.now()) : null;
  const waitLabel =
    waitMs != null
      ? `${Math.floor(Math.ceil(waitMs / 1000) / 60)}:${(Math.ceil(waitMs / 1000) % 60).toString().padStart(2, "0")}`
      : null;
  const canSwitch = awaitingPharmacy && order.canReassignPharmacy;
  const itemList  = order.itemList ?? [];
  const itemCount = itemList.length || order.items.split(",").length;
  const firstName = itemList.length > 0 ? itemList[0].name : order.items.split(",")[0]?.trim();

  const openOrder = () => router.push(`/orders/${order.id}`);

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-3xl border shadow-sm hover:shadow-md dark:hover:shadow-black/20 transition-shadow overflow-hidden cursor-pointer group",
      awaitingPharmacy ? "border-slate-200 dark:border-slate-700 hover:border-farumasi-200 dark:hover:border-emerald-700/50" : "border-slate-100 dark:border-slate-700 hover:border-farumasi-200 dark:hover:border-emerald-700/50",
    )}
      role="link"
      tabIndex={0}
      onClick={openOrder}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openOrder();
        }
      }}
    >
      {awaitingPharmacy && (
        <div className={cn(
          "px-5 py-2.5 flex items-center justify-between gap-2 text-xs font-bold border-b",
          canSwitch
            ? "bg-farumasi-50 text-farumasi-900 border-farumasi-100 dark:bg-farumasi-950/30 dark:text-farumasi-200 dark:border-farumasi-900/50"
            : "bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50",
        )}>
          <span className="flex items-center gap-1.5">
            {canSwitch ? (
              <>
                <Zap className="w-3.5 h-3.5" />
                Faster pharmacies available
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                Waiting for {order.pharmacy}
              </>
            )}
          </span>
          {!canSwitch && (
            <PharmacyReassignmentBadge
              canReassign={false}
              waitLabel={waitLabel}
              waitMs={waitMs}
            />
          )}
        </div>
      )}
      {/* Top strip — order code + delivery type */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-farumasi-700 dark:text-emerald-300 bg-farumasi-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
            {order.orderCode ?? order.id.slice(0, 8).toUpperCase()}
          </span>
          {order.deliveryMethod && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
              order.deliveryMethod === "delivery"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                : "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
            )}>
              {order.deliveryMethod === "delivery"
                ? <><Truck className="w-3 h-3" /> {DELIVERY_LABELS.delivery}</>
                : <><Building2 className="w-3 h-3" /> {DELIVERY_LABELS.pickup}</>}
            </span>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="px-5 pt-3 pb-4 space-y-3">
        {/* Pharmacy + date */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{order.pharmacy}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />{timeAgo(order.createdAt)}
          </p>
        </div>

        {/* Item chips */}
        <div className="flex flex-wrap gap-1.5">
          {itemList.slice(0, 3).map((it) => (
            <span key={it.id} className="flex items-center gap-1 text-[11px] bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full font-medium">
              <Pill className="w-3 h-3 text-farumasi-500 shrink-0" />
              {it.name.length > 22 ? it.name.slice(0, 21) + "…" : it.name}
              {it.sellMode === "partial" && (
                <span className="text-farumasi-500 font-bold">·{it.quantity}u</span>
              )}
              {it.sellMode !== "partial" && it.quantity > 1 && (
                <span className="text-slate-400 dark:text-slate-500">×{it.quantity}</span>
              )}
            </span>
          ))}
          {itemCount > 3 && (
            <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full font-medium">
              +{itemCount - 3} more
            </span>
          )}
          {itemList.length === 0 && firstName && (
            <span className="text-[11px] bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full font-medium">
              <Pill className="w-3 h-3 text-farumasi-500 inline mr-1" />{firstName}
            </span>
          )}
        </div>

        {/* Footer: total + actions */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total</p>
            <p className="text-base font-extrabold text-farumasi-700 dark:text-emerald-300">{order.total}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="flex items-center gap-1.5 bg-farumasi-600 group-hover:bg-farumasi-700 text-white px-4 py-2 rounded-2xl text-sm font-semibold transition-colors">
              {t.orders_track}
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PastOrderCard({ order, onArchive }: { order: Order; onArchive: () => void }) {
  const [confirmTrash, setConfirmTrash] = useState(false);
  const itemList  = order.itemList ?? [];
  const itemCount = itemList.length || order.items.split(",").length;
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="relative">
      <Link href={`/orders/${order.id}`}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3 hover:shadow-sm hover:border-farumasi-200 dark:hover:border-emerald-700/50 transition-all pr-12">
          {/* Status icon */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isDelivered ? "bg-farumasi-50 dark:bg-emerald-950/40" : isCancelled ? "bg-red-50 dark:bg-red-950/40" : "bg-slate-100 dark:bg-slate-700",
          )}>
            {isDelivered
              ? <CheckCircle2 className="w-5 h-5 text-farumasi-600 dark:text-emerald-400" />
              : isCancelled
              ? <XCircle className="w-5 h-5 text-red-400" />
              : <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {order.orderCode ?? order.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">{order.pharmacy}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
              <Pill className="w-2.5 h-2.5" />
              {itemCount} item{itemCount !== 1 ? "s" : ""}
              <span className="mx-1">·</span>
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(order.createdAt)}
            </p>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.total}</p>
            {order.deliveryMethod && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                order.deliveryMethod === "delivery"
                  ? "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300"
                  : "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
              )}>
                {DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5" />
          </div>
        </div>
      </Link>

      {/* Trash button — float top-right, removes from history (localStorage archive) */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmTrash(true); }}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        title="Remove from history"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Inline trash confirmation */}
      {confirmTrash && (
        <div className="absolute inset-0 z-10 bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center justify-between px-4 gap-3 shadow-md">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Remove from history?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmTrash(false); }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Keep
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(); }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyOrders({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">{message}</p>
      <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Your order history will appear here.</p>
      <Link
        href="/store"
        className="mt-5 inline-flex items-center gap-2 bg-farumasi-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-farumasi-700 transition-colors"
      >
        <Store className="w-4 h-4" />
        Browse medicines
      </Link>
    </div>
  );
}
