"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Filter, Download, ChevronRight, Loader2, Clock } from "lucide-react";
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
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
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
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ordersService
      .listPartnerOrders({ offset: 0, limit: 100 })
      .then(res => {
        if (cancelled) return;
        setOrders(res.items);
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

  const kpis = useMemo(() => {
    const pending = orders.filter(o => orderStatus(o) === "pending").length;
    const inProgress = orders.filter(o =>
      IN_PROGRESS_STATUSES.includes(orderStatus(o) as OrderStatus),
    ).length;
    const completed = orders.filter(o =>
      ["completed", "delivered"].includes(orderStatus(o)),
    ).length;
    const cancelled = orders.filter(o =>
      ["cancelled", "rejected", "failed"].includes(orderStatus(o)),
    ).length;
    return { pending, inProgress, completed, cancelled };
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage incoming and outgoing customer orders"
        icon={ShoppingCart}
        actions={
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Export coming soon")}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Pending" value={String(kpis.pending)} icon={ShoppingCart} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="In Progress" value={String(kpis.inProgress)} icon={Clock} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard title="Completed" value={String(kpis.completed)} icon={ShoppingCart} iconBg="bg-green-100" iconColor="text-green-600" />
        <KpiCard title="Cancelled" value={String(kpis.cancelled)} icon={ShoppingCart} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard title="Total Orders" value={orders.length.toLocaleString()} icon={ShoppingCart} />
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
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
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
                        <TableHead>Placed</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
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
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
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
        </CardContent>
      </Card>
    </div>
  );
}
