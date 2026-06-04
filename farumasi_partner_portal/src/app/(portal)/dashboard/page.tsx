"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign, ShoppingCart, Package, AlertTriangle,
  ArrowRight, LayoutDashboard, Loader2, Clock,
} from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { formatCompactRWF, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { listingsService, type BackendListing } from "@/lib/services/listings.service";
import { revenueService, type BackendRevenueRecord } from "@/lib/services/revenue.service";
import type { ChartDataPoint } from "@/types";
import type { OrderStatus, ProductStatus } from "@/types";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

const LOW_THRESHOLD = 10;

const IN_PROGRESS_STATUSES = new Set([
  "pending",
  "accepted",
  "preparing",
  "processing",
  "ready_for_pickup",
  "confirmed",
  "pharmacy_accepted",
]);

function uiStatus(l: BackendListing): ProductStatus {
  if (l.availability_status === "out_of_stock" || l.stock_quantity <= 0) return "out_of_stock";
  if (l.availability_status === "unavailable") return "unavailable";
  if (l.stock_quantity <= LOW_THRESHOLD) return "low_stock";
  return "available";
}

function shortId(id: string): string {
  return `FRM-${id.slice(0, 8).toUpperCase()}`;
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [range, setRange] = useState<DateRangeValue>("month");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [revenue, setRevenue] = useState<BackendRevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      ordersService.listPartnerOrders({ offset: 0, limit: 100 }),
      listingsService.listMyListings({ offset: 0, limit: 200 }),
      revenueService.listTransactions().catch(() => [] as BackendRevenueRecord[]),
    ])
      .then(([o, l, r]) => {
        if (cancelled) return;
        setOrders(o.items);
        setListings(l.items);
        setRevenue(r);
      })
      .catch(err => {
        if (cancelled) return;
        toast.error(getApiError(err, "Failed to load dashboard"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const kpis = useMemo(() => {
    const monthlyRevenue = orders
      .filter(o => o.status === "completed" || o.status === "delivered")
      .reduce((s, o) => s + (o.net_amount ?? o.total_amount), 0);
    const inProgressOrders = orders.filter(o =>
      IN_PROGRESS_STATUSES.has((o.status || o.order_status || "").toLowerCase()),
    ).length;
    const totalProducts = listings.length;
    const activeListings = listings.filter(l => uiStatus(l) === "available").length;
    const lowStockCount = listings.filter(l => {
      const s = uiStatus(l);
      return s === "low_stock" || s === "out_of_stock";
    }).length;
    return { monthlyRevenue, inProgressOrders, totalProducts, activeListings, lowStockCount };
  }, [orders, listings]);

  // Build orders chart: last 7 days by date
  const ordersChart = useMemo<ChartDataPoint[]>(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map[key] = 0;
    }
    orders.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (key in map) map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [orders]);

  // Build revenue chart: last 6 months by month
  const revenueChart = useMemo<ChartDataPoint[]>(() => {
    const map: Record<string, { value: number; secondary: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      map[key] = { value: 0, secondary: 0 };
    }
    revenue.forEach(r => {
      const key = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (key in map) {
        map[key].value += r.net_amount;
        map[key].secondary += r.platform_commission;
      }
    });
    // If no real revenue, derive from completed orders
    if (revenue.length === 0) {
      orders.filter(o => o.status === "completed" || o.status === "delivered").forEach(o => {
        const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (key in map) map[key].value += o.net_amount ?? o.total_amount;
      });
    }
    return Object.entries(map).map(([label, { value, secondary }]) => ({ label, value, secondary }));
  }, [revenue, orders]);

  const recentOrders = orders.slice(0, 5);
  const lowStockProducts = listings
    .filter(l => { const s = uiStatus(l); return s === "low_stock" || s === "out_of_stock"; })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.full_name?.split(" ")[0] || "Partner"} — here's your business overview`}
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/orders" className="block">
          <KpiCard
            title="Orders in Progress"
            value={String(kpis.inProgressOrders)}
            icon={Clock}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            className="h-full hover:border-farumasi-300 transition-colors cursor-pointer"
          />
        </Link>
        <KpiCard
          title="Revenue (Completed)"
          value={formatCompactRWF(kpis.monthlyRevenue)}
          icon={DollarSign}
        />
        <KpiCard
          title="Active Listings"
          value={`${kpis.activeListings} / ${kpis.totalProducts}`}
          icon={Package}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <KpiCard
          title="Open Orders (pending)"
          value={String(orders.filter(o => o.status === "pending").length)}
          icon={ShoppingCart}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <KpiCard
          title="Low Stock Items"
          value={String(kpis.lowStockCount)}
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Net revenue vs commission — {RANGE_LABELS[range]}</CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <DateRangeFilter value={range} onChange={setRange} />
                <div className="flex items-center gap-3 text-[11px] shrink-0">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-farumasi-500 inline-block" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />Commission</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueChart} height={220} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Daily order count — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersChart data={ordersChart} height={180} />
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Total tracked</span>
              <span className="text-sm font-bold text-foreground">{orders.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders" className="text-xs text-farumasi-600">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && recentOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{shortId(order.id)}</TableCell>
                    <TableCell className="text-xs">{order.patient?.user?.full_name || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{formatCompactRWF(order.net_amount ?? order.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={order.status as OrderStatus} type="order" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {lowStockProducts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-amber-800">Stock Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.product?.name || "Product"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.stock_quantity} units remaining</p>
                    </div>
                    <StatusBadge status={uiStatus(p)} type="product" />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs" asChild>
                  <Link href="/products/listed">Manage Listings</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && lowStockProducts.length === 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle>Stock Health</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">All listings have healthy stock levels.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
