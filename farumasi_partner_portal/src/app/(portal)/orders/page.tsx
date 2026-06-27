"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingCart, Download, ChevronRight, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { formatCompactRWF, timeAgo } from "@/lib/utils";
import { downloadCsv } from "@/lib/export-csv";
import { DEFAULT_PAGE_SIZE, fetchAllPages } from "@/lib/pagination";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import {
  formatCountdown,
  isAwaitingPartnerConfirm,
  isReassignmentRisk,
  partnerResponseRemainingMs,
} from "@/lib/order-sla";
import type { OrderStatus } from "@/types";

const ORDER_TABS: { label: string; value: string; statuses?: OrderStatus[] }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new", statuses: ["pending"] },
  { label: "In Progress", value: "progress", statuses: ["accepted", "preparing", "ready_for_pickup", "out_for_delivery"] },
  { label: "Completed", value: "completed", statuses: ["delivered", "completed"] },
  { label: "Cancelled", value: "cancelled", statuses: ["cancelled", "rejected", "failed"] },
];

const IN_PROGRESS_STATUSES: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
];

function orderStatus(o: BackendOrder): string {
  return (o.status || o.order_status || "").toLowerCase();
}

function shortId(id: string): string {
  return `FRM-${id.slice(0, 8).toUpperCase()}`;
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [statsOrders, setStatsOrders] = useState<BackendOrder[]>([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ordersService
      .listPartnerOrders({ offset: 0, limit: DEFAULT_PAGE_SIZE })
      .then(res => {
        if (cancelled) return;
        setOrders(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        const msg = getApiError(err, "Failed to load orders");
        setError(msg);
        toast.error(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAllPages((offset, limit) => ordersService.listPartnerOrders({ offset, limit }))
      .then((rows) => { if (!cancelled) setStatsOrders(rows); })
      .catch(() => { if (!cancelled) setStatsOrders([]); });
    return () => { cancelled = true; };
  }, []);

  const loadMore = () => {
    if (loadingMore || orders.length >= total) return;
    setLoadingMore(true);
    ordersService
      .listPartnerOrders({ offset: orders.length, limit: DEFAULT_PAGE_SIZE })
      .then(res => {
        setOrders(prev => [...prev, ...res.items]);
        setTotal(res.total);
      })
      .catch(err => toast.error(getApiError(err, "Failed to load more orders")))
      .finally(() => setLoadingMore(false));
  };

  const exportVisibleOrders = (rows: BackendOrder[]) => {
    downloadCsv(
      `orders-${new Date().toISOString().slice(0, 10)}`,
      ["Order #", "Customer", "Phone", "Type", "Status", "Net amount", "Subtotal", "Placed"],
      rows.map(o => [
        shortId(o.id),
        o.patient?.user?.full_name ?? "",
        o.patient?.user?.phone ?? "",
        o.is_delivery ? "Delivery" : "Pickup",
        o.status,
        o.net_amount ?? o.total_amount,
        o.subtotal ?? o.total_amount,
        o.created_at,
      ]),
    );
    toast.success("Orders exported");
  };

  const kpis = useMemo(() => {
    const source = statsOrders.length > 0 ? statsOrders : orders;
    const pending = source.filter(o => orderStatus(o) === "pending").length;
    const inProgress = source.filter(o =>
      IN_PROGRESS_STATUSES.includes(orderStatus(o) as OrderStatus),
    ).length;
    const completed = source.filter(o =>
      ["completed", "delivered"].includes(orderStatus(o)),
    ).length;
    const cancelled = source.filter(o =>
      ["cancelled", "rejected", "failed"].includes(orderStatus(o)),
    ).length;
    return { pending, inProgress, completed, cancelled };
  }, [statsOrders, orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage incoming and outgoing customer orders"
        icon={ShoppingCart}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => exportVisibleOrders(orders)}
            disabled={orders.length === 0}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Pending" value={String(kpis.pending)} icon={ShoppingCart} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="In Progress" value={String(kpis.inProgress)} icon={Clock} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard title="Completed" value={String(kpis.completed)} icon={ShoppingCart} iconBg="bg-green-100" iconColor="text-green-600" />
        <KpiCard title="Cancelled" value={String(kpis.cancelled)} icon={ShoppingCart} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard title="Total Orders" value={total.toLocaleString()} icon={ShoppingCart} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Input
                placeholder="Search by order # or customer…"
                className="h-8 text-xs pl-3"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={deliveryFilter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setDeliveryFilter("all")}
            >
              All types
            </Button>
            <Button
              variant={deliveryFilter === "delivery" ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setDeliveryFilter("delivery")}
            >
              Delivery
            </Button>
            <Button
              variant={deliveryFilter === "pickup" ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setDeliveryFilter("pickup")}
            >
              Pickup
            </Button>
          </div>

          <Tabs defaultValue="all">
            <div className="px-4 pt-3">
              <TabsList className="h-8">
                {ORDER_TABS.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 h-6">
                    {tab.label}
                    {tab.value === "new" && kpis.pending > 0 && (
                      <span className="ml-1 text-[9px] font-bold bg-farumasi-600 text-white rounded-full px-1">{kpis.pending}</span>
                    )}
                    {tab.value === "progress" && kpis.inProgress > 0 && (
                      <span className="ml-1 text-[9px] font-bold bg-blue-600 text-white rounded-full px-1">{kpis.inProgress}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {ORDER_TABS.map(tab => {
              const q = search.toLowerCase();
              const filtered = orders
                .filter(o =>
                  tab.statuses
                    ? tab.statuses.includes(orderStatus(o) as OrderStatus)
                    : true,
                )
                .filter(o => {
                  if (deliveryFilter === "delivery") return o.is_delivery;
                  if (deliveryFilter === "pickup") return !o.is_delivery;
                  return true;
                })
                .filter(o => {
                  if (!q) return true;
                  const num = shortId(o.id).toLowerCase();
                  const name = o.patient?.user?.full_name?.toLowerCase() || "";
                  return num.includes(q) || name.includes(q);
                });
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Placed</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Loading orders…
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && filtered.map(order => {
                        const subtotal = order.subtotal ?? order.total_amount;
                        const net = order.net_amount ?? order.total_amount;
                        const itemNames = order.items.map(i => i.product?.name || "Item").join(", ");
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs font-semibold">{shortId(order.id)}</TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{order.patient?.user?.full_name || "—"}</p>
                              <p className="text-[11px] text-muted-foreground">{order.patient?.user?.phone || ""}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{itemNames}</p>
                            </TableCell>
                            <TableCell>
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${order.is_delivery ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                {order.is_delivery ? "Delivery" : "Pickup"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-semibold">{formatCompactRWF(net)}</p>
                              <p className="text-[11px] text-muted-foreground">subtotal {formatCompactRWF(subtotal)}</p>
                            </TableCell>
                            <TableCell><StatusBadge status={order.status as OrderStatus} type="order" /></TableCell>
                            <TableCell className="text-xs">
                              {isAwaitingPartnerConfirm(order) ? (
                                isReassignmentRisk({ ...order, now: nowTick }) ? (
                                  <span className="text-red-600 font-semibold">Switch open</span>
                                ) : partnerResponseRemainingMs(order.partner_response_due_at, nowTick) != null ? (
                                  <span className="text-amber-700 font-medium">
                                    {formatCountdown(partnerResponseRemainingMs(order.partner_response_due_at, nowTick)!)}
                                  </span>
                                ) : (
                                  <span className="text-amber-600">Confirm soon</span>
                                )
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
                                <Link href={`/orders/${order.id}`}>View <ChevronRight className="w-3 h-3" /></Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!loading && filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                            {error || "No orders in this category."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>

          {!loading && orders.length < total && (
            <div className="p-4 border-t flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Loading…
                  </>
                ) : (
                  `Load more (${orders.length} of ${total})`
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
