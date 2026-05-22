"use client";

import { useState } from "react";
import {
  DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp,
  Bell, Clock, CheckCircle2, XCircle, ArrowRight, Boxes, LayoutDashboard
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
import { TopProductsChart } from "@/components/charts/top-products-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  mockKPIs, mockOrders, mockRevenueChart, mockOrdersChart,
  mockTopProducts, mockListedProducts, mockActivityLogs, mockNotifications
} from "@/data/mock";
import { formatCompactRWF, formatRWF, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const [range, setRange] = useState<DateRangeValue>("month");
  const lowStockProducts = mockListedProducts.filter(p => p.status === "low_stock" || p.status === "out_of_stock");
  const recentOrders = mockOrders.slice(0, 5);
  const unreadNotifications = mockNotifications.filter(n => !n.isRead);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back, Kalisa David — here's your business overview"
        icon={LayoutDashboard}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monthly Revenue"
          value={formatCompactRWF(mockKPIs.monthlyRevenue)}
          delta={mockKPIs.revenueGrowth}
          deltaLabel="vs last month"
          icon={DollarSign}
        />
        <KpiCard
          title="Active Listings"
          value={`${mockKPIs.activeListings} / ${mockKPIs.totalProducts}`}
          icon={Package}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <KpiCard
          title="Pending Orders"
          value={String(mockKPIs.pendingOrders)}
          icon={ShoppingCart}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <KpiCard
          title="Low Stock Items"
          value={String(mockKPIs.lowStockCount)}
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Charts Row */}
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
            <RevenueChart data={mockRevenueChart} height={220} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Daily order count — {RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersChart data={mockOrdersChart} height={180} />
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Total this week</span>
              <span className="text-sm font-bold text-foreground">
                {mockOrdersChart.reduce((s, d) => s + d.value, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Recent Orders + Top Products + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders */}
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
                {recentOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell className="text-xs">{order.customerName}</TableCell>
                    <TableCell className="text-xs font-medium">{formatCompactRWF(order.netAmount)}</TableCell>
                    <TableCell><StatusBadge status={order.status} type="order" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(order.placedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Top products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>By total sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsChart data={mockTopProducts} height={180} />
            </CardContent>
          </Card>

          {/* Inventory alerts */}
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
                      <p className="text-xs font-medium text-foreground truncate">{p.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.stockQty} units remaining</p>
                    </div>
                    <StatusBadge status={p.status} type="product" />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs" asChild>
                  <Link href="/inventory">Manage Inventory</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Activity + Notifications footer row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/activity" className="text-xs text-farumasi-600">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockActivityLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 mt-0.5">
                  {log.performedBy.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{log.action}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{log.details}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(log.timestamp)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Notifications</CardTitle>
                {unreadNotifications.length > 0 && (
                  <span className="text-[10px] font-bold bg-farumasi-600 text-white rounded-full px-1.5 py-0.5">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/notifications" className="text-xs text-farumasi-600">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockNotifications.slice(0, 4).map(n => (
              <div key={n.id} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? "bg-farumasi-500" : "bg-slate-200"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.timestamp)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


