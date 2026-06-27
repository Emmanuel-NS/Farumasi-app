"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign, ShoppingCart, Package, AlertTriangle,
  ArrowRight, LayoutDashboard, Loader2, Clock, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS, getDateRangeStart } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { formatCompactRWF, formatRWF, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { partnerService, type BackendPartnerCompany } from "@/lib/services/partner.service";
import { listingsService, type BackendListing } from "@/lib/services/listings.service";
import { revenueService, type BackendRevenueRecord, type BackendRevenueSummary } from "@/lib/services/revenue.service";
import { buildRevenueChartData } from "@/lib/revenue-utils";
import { fetchAllPages } from "@/lib/pagination";
import type { ChartDataPoint } from "@/types";
import type { OrderStatus, ProductStatus } from "@/types";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import api from "@/lib/api";
import { StoreOpenToggle } from "@/components/shared/store-open-toggle";

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
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [revenue, setRevenue] = useState<BackendRevenueRecord[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<BackendRevenueSummary | null>(null);
  const [allOrdersForStats, setAllOrdersForStats] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<BackendPartnerCompany | null>(null);
  const [pharmacyProfile, setPharmacyProfile] = useState<{ verification_status?: string; status?: string } | null>(null);

  useEffect(() => {
    if (user?.role === "partner_company_admin") {
      partnerService.getMine().then(setPartnerProfile).catch(() => setPartnerProfile(null));
      setPharmacyProfile(null);
      return;
    }
    if (user?.role === "pharmacy_admin" || user?.role === "pharmacist") {
      api.get<{ verification_status?: string; status?: string }>("/pharmacies/me")
        .then((r) => setPharmacyProfile(r.data))
        .catch(() => setPharmacyProfile(null));
      setPartnerProfile(null);
    }
  }, [user?.role]);

  // Initial load: listings, revenue summary (not range-dependent)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listingsService.listMyListings({ offset: 0, limit: 100 }),
      revenueService.listTransactions().catch(() => [] as BackendRevenueRecord[]),
      revenueService.getSummary().catch(() => null),
    ])
      .then(([l, r, summary]) => {
        if (cancelled) return;
        setListings(l.items);
        setListingsTotal(l.total);
        setRevenue(r);
        setRevenueSummary(summary);
      })
      .catch(err => {
        if (cancelled) return;
        toast.error(getApiError(err, "Failed to load dashboard"));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAllPages((offset, limit) => ordersService.listPartnerOrders({ offset, limit }))
      .then((rows) => { if (!cancelled) setAllOrdersForStats(rows); })
      .catch(() => { if (!cancelled) setAllOrdersForStats([]); });
    return () => { cancelled = true; };
  }, []);

  // Orders reload when range changes — use from_date to get full chart data for the period
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fromDate = getDateRangeStart(range).toISOString();
    ordersService.listPartnerOrders({ offset: 0, limit: 100, from_date: fromDate })
      .then(o => {
        if (cancelled) return;
        setOrders(o.items);
        setOrdersTotal(o.total);
      })
      .catch(err => {
        if (cancelled) return;
        toast.error(getApiError(err, "Failed to load orders"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [range]);

  const kpis = useMemo(() => {
    const inProgressOrders = allOrdersForStats.filter(o =>
      IN_PROGRESS_STATUSES.has((o.status || o.order_status || "").toLowerCase()),
    ).length;
    const pendingOrders = allOrdersForStats.filter(o =>
      (o.status || o.order_status || "").toLowerCase() === "pending",
    ).length;
    const totalProducts = listingsTotal || listings.length;
    const activeListings = listings.filter(l => uiStatus(l) === "available").length;
    const lowStockCount = listings.filter(l => {
      const s = uiStatus(l);
      return s === "low_stock" || s === "out_of_stock";
    }).length;
    return {
      availableBalance: revenueSummary?.available_balance ?? 0,
      netEarnings: revenueSummary?.total_net ?? 0,
      inProgressOrders,
      pendingOrders,
      totalProducts,
      activeListings,
      lowStockCount,
    };
  }, [allOrdersForStats, listings, listingsTotal, revenueSummary]);

  // Build orders chart filtered by the selected date range (mirrors buildRevenueChartData)
  const ordersChart = useMemo<ChartDataPoint[]>(() => {
    const start = getDateRangeStart(range);
    const rows: { label: string; value: number; sortKey: number }[] = [];
    const index = new Map<string, number>();

    for (const o of orders) {
      const d = new Date(o.created_at);
      if (d < start) continue;

      let label: string;
      let sortKey: number;

      if (range === "today" || range === "week" || range === "14d") {
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      } else if (range === "month") {
        label = `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
        sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      } else {
        label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      }

      const key = String(sortKey);
      if (!index.has(key)) {
        index.set(key, rows.length);
        rows.push({ label, value: 0, sortKey });
      }
      rows[index.get(key)!].value += 1;
    }

    return rows
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ label, value }) => ({ label, value }));
  }, [orders, range]);

  const revenueChart = useMemo<ChartDataPoint[]>(() => {
    return buildRevenueChartData(revenue, range);
  }, [revenue, range]);

  const recentOrders = orders.slice(0, 5);
  const lowStockProducts = listings
    .filter(l => { const s = uiStatus(l); return s === "low_stock" || s === "out_of_stock"; })
    .slice(0, 4);

  const sellerProfile = partnerProfile ?? pharmacyProfile;
  const pendingApproval =
    sellerProfile &&
    (sellerProfile.verification_status !== "verified" || sellerProfile.status !== "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.full_name?.split(" ")[0] || "Partner"} — here's your business overview`}
        icon={LayoutDashboard}
      />

      {pendingApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Application under review</p>
            <p className="text-xs mt-1 text-amber-800">
              FARUMASI is reviewing your regulatory license and business details. You can configure
              your profile and view orders; new listings go live after approval.
            </p>
          </div>
        </div>
      )}

      <StoreOpenToggle />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <Link href="/revenue" className="block">
          <KpiCard
            title="Available Balance"
            value={formatRWF(kpis.availableBalance)}
            icon={DollarSign}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            className="h-full hover:border-farumasi-300 transition-colors cursor-pointer"
          />
        </Link>
        <KpiCard
          title="Net Earnings (all time)"
          value={formatRWF(kpis.netEarnings)}
          icon={TrendingUp}
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
          value={String(kpis.pendingOrders)}
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
              <span className="text-xs text-muted-foreground">All orders (total)</span>
              <span className="text-sm font-bold text-foreground">{ordersTotal}</span>
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
