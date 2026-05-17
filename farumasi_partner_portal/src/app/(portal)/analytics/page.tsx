"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, ShoppingCart, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import { TopProductsChart } from "@/components/charts/top-products-chart";
import { mockRevenueChart, mockOrdersChart, mockTopProducts, mockKPIs } from "@/data/mock";
import { formatCompactRWF } from "@/lib/utils";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRangeValue>("month");
  const conversionRate = ((mockKPIs.completedOrders / (mockKPIs.completedOrders + mockKPIs.cancelledOrders)) * 100).toFixed(1);
  const avgOrderValue = Math.round(mockKPIs.monthlyRevenue / (mockKPIs.completedOrders / 12));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep-dive insights into your sales performance and inventory"
        icon={BarChart3}
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monthly Revenue"
          value={formatCompactRWF(mockKPIs.monthlyRevenue)}
          delta={mockKPIs.revenueGrowth}
          deltaLabel="vs last month"
          icon={TrendingUp}
        />
        <KpiCard title="Total Orders" value={mockKPIs.completedOrders.toLocaleString()} icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard title="Avg. Order Value" value={formatCompactRWF(avgOrderValue)} icon={BarChart3} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <KpiCard title="Conversion Rate" value={`${conversionRate}%`} icon={Package} iconBg="bg-teal-100" iconColor="text-teal-600" />
      </div>

      {/* Revenue trend */}
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
          <RevenueChart data={mockRevenueChart} height={260} />
        </CardContent>
      </Card>

      {/* Orders + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
            <CardDescription>Order volume — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersChart data={mockOrdersChart} height={220} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Ranked by total units sold — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsChart data={mockTopProducts} height={220} />
          </CardContent>
        </Card>
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Active Listings", value: mockKPIs.activeListings },
          { label: "Low Stock", value: mockKPIs.lowStockCount },
          { label: "Pending Orders", value: mockKPIs.pendingOrders },
          { label: "Completed Orders", value: mockKPIs.completedOrders },
          { label: "Cancelled Orders", value: mockKPIs.cancelledOrders },
          { label: "Unread Alerts", value: mockKPIs.unreadNotifications },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
