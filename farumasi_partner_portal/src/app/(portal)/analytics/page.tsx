"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, ShoppingCart, Package, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS, getDateRangeStart } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import { TopProductsChart } from "@/components/charts/top-products-chart";
import { formatCompactRWF } from "@/lib/utils";
import { revenueService, type BackendRevenueRecord } from "@/lib/services/revenue.service";
import { ordersService } from "@/lib/services/orders.service";
import type { BackendOrder } from "@/lib/services/orders.service";
import { listingsService } from "@/lib/services/listings.service";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRangeValue>("month");
  const [summary, setSummary] = useState<{ total_gross: number; completed_orders: number; total_commission: number } | null>(null);
  const [transactions, setTransactions] = useState<BackendRevenueRecord[]>([]);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      revenueService.getSummary(),
      revenueService.listTransactions(),
      ordersService.listPartnerOrders({ limit: 100 }),
      listingsService.listMyListings({ limit: 1 }),
    ])
      .then(([s, txs, ords, listings]) => {
        setSummary(s);
        setTransactions(txs);
        setOrders(ords.items);
        setListingCount(listings.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rangeStart = useMemo(() => getDateRangeStart(range).getTime(), [range]);
  const filteredTxs = useMemo(() => transactions.filter(t => new Date(t.created_at).getTime() >= rangeStart), [transactions, rangeStart]);
  const filteredOrders = useMemo(() => orders.filter(o => new Date(o.created_at).getTime() >= rangeStart), [orders, rangeStart]);

  const revenueChartData = useMemo(() => {
    const grouped: Record<string, { value: number; commission: number }> = {};
    filteredTxs.forEach(t => {
      const d = new Date(t.created_at);
      const label = range === "week" ? d.toLocaleDateString("en-US", { weekday: "short" })
        : range === "month" ? `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`
        : d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[label]) grouped[label] = { value: 0, commission: 0 };
      grouped[label].value += t.net_amount;
      grouped[label].commission += t.platform_commission;
    });
    return Object.entries(grouped).map(([label, v]) => ({ label, value: v.value, commission: v.commission }));
  }, [filteredTxs, range]);

  const ordersChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const d = new Date(o.created_at);
      const label = range === "week" ? d.toLocaleDateString("en-US", { weekday: "short" })
        : range === "month" ? `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`
        : d.toLocaleDateString("en-US", { month: "short" });
      grouped[label] = (grouped[label] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredOrders, range]);

  const topProducts = useMemo(() => {
    const totals: Record<string, { name: string; value: number }> = {};
    filteredOrders.forEach(o => {
      o.items?.forEach(item => {
        const name = item.product?.name ?? "Unknown";
        if (!totals[name]) totals[name] = { name, value: 0 };
        totals[name].value += item.quantity;
      });
    });
    return Object.values(totals).sort((a, b) => b.value - a.value).slice(0, 8).map(p => ({ label: p.name, value: p.value }));
  }, [filteredOrders]);

  const completedOrders = filteredOrders.filter(o => ["delivered","completed"].includes(o.order_status)).length;
  const pendingOrders = filteredOrders.filter(o => ["pending", "preparing"].includes(o.order_status)).length;
  const cancelledOrders = filteredOrders.filter(o => o.order_status === "cancelled").length;
  const rangeRevenue = filteredTxs.reduce((s, t) => s + t.net_amount, 0);
  const avgOrderValue = completedOrders > 0 ? Math.round(rangeRevenue / completedOrders) : 0;
  const conversionRate = (completedOrders + cancelledOrders) > 0
    ? ((completedOrders / (completedOrders + cancelledOrders)) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep-dive insights into your sales performance and inventory"
        icon={BarChart3}
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Revenue" value={formatCompactRWF(rangeRevenue)} icon={TrendingUp} />
        <KpiCard title="Orders" value={filteredOrders.length.toLocaleString()} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard title="Avg. Order Value" value={formatCompactRWF(avgOrderValue)} icon={BarChart3} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <KpiCard title="Conversion Rate" value={`${conversionRate}%`} icon={Package} iconBg="bg-teal-100" iconColor="text-teal-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Net revenue vs commission — {RANGE_LABELS[range]}</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-farumasi-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />Commission</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenueChartData} height={260} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
            <CardDescription>Order volume — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersChart data={ordersChartData} height={220} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Ranked by units sold — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0
              ? <p className="text-sm text-muted-foreground py-10 text-center">No sales data in this period.</p>
              : <TopProductsChart data={topProducts} height={220} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Active Listings", value: listingCount },
          { label: "Pending Orders", value: pendingOrders },
          { label: "Completed Orders", value: completedOrders },
          { label: "Cancelled Orders", value: cancelledOrders },
          { label: "Total Commission", value: formatCompactRWF(filteredTxs.reduce((s, t) => s + t.platform_commission, 0)) },
          { label: "All-time Revenue", value: formatCompactRWF(summary?.total_gross ?? 0) },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4 px-4 text-center">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
