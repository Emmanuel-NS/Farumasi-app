"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRWF, cn } from "@/lib/utils";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from "@/components/ui";
import {
  Users, ShoppingBag, Truck, Stethoscope, FileText,
  AlertTriangle, Activity,
  Navigation, BadgeCheck, TrendingUp, Package, ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { analyticsService, type AdminSummary } from "@/lib/services/analytics.service";
import api from "@/lib/api";

interface BackendOrder {
  id: string;
  order_status: string;
  total_amount: number;
  created_at: string;
}

interface BackendProductRequest {
  id: string;
  product_name: string;
  category?: string | null;
  status: string;
  created_at: string;
  requester?: { id: string; user?: { id: string; full_name: string } | null } | null;
}

interface BackendListing {
  id: string;
  stock_quantity: number;
  availability_status: string;
  product?: { id: string; name: string } | null;
  pharmacy?: { id: string; name: string } | null;
}

function buildOrdersChart(orders: BackendOrder[]) {
  const now = new Date();
  const days: { date: string; orders: number; completed: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: 0,
      completed: 0,
    });
  }
  orders.forEach((o) => {
    const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const bucket = days.find((d) => d.date === key);
    if (bucket) {
      bucket.orders += 1;
      if (o.order_status === "completed") bucket.completed += 1;
    }
  });
  return days;
}

function buildRevenueChart(orders: BackendOrder[]) {
  const now = new Date();
  const months: { date: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue: 0,
    });
  }
  orders
    .filter((o) => o.order_status === "completed")
    .forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const bucket = months.find((m) => m.date === key);
      if (bucket) bucket.revenue += Math.round(o.total_amount / 1000);
    });
  return months;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BackendProductRequest[]>([]);
  const [lowStockListings, setLowStockListings] = useState<BackendListing[]>([]);

  useEffect(() => {
    analyticsService.getAdminSummary().then(setSummary).catch(() => {});

    api
      .get<{ items: BackendOrder[]; total: number }>("/orders/", { params: { limit: 200, offset: 0 } })
      .then((r) => setOrders(r.data.items))
      .catch(() => {});

    api
      .get<{ items: BackendProductRequest[]; total: number }>("/product-requests/", {
        params: { status: "pending", limit: 5 },
      })
      .then((r) => setPendingRequests(r.data.items))
      .catch(() => {});

    api
      .get<{ items: BackendListing[]; total: number }>("/listings/", {
        params: { limit: 100, offset: 0 },
      })
      .then((r) => {
        const low = r.data.items
          .filter((l) => l.stock_quantity <= 10 || l.availability_status === "out_of_stock")
          .slice(0, 5);
        setLowStockListings(low);
      })
      .catch(() => {});
  }, []);

  const ordersChart = useMemo(() => buildOrdersChart(orders), [orders]);
  const revenueChart = useMemo(() => buildRevenueChart(orders), [orders]);

  const fulfillmentRate =
    summary && summary.total_orders > 0
      ? Math.round((summary.completed_orders / summary.total_orders) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">FARUMASI Ecosystem</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Command Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of the FARUMASI healthcare ecosystem.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={(summary?.total_users ?? 0).toLocaleString()} icon={Users} color="text-farumasi-700" />
        <StatCard label="Total Pharmacies" value={summary?.total_pharmacies ?? 0} icon={ShoppingBag} color="text-purple-700" />
        <StatCard label="Total Doctors" value={(summary?.total_doctors ?? 0).toLocaleString()} icon={Stethoscope} color="text-sky-700" />
        <StatCard label="Active Riders" value={summary?.total_riders ?? 0} icon={Navigation} color="text-teal-700" />
        <StatCard label="Total Orders" value={(summary?.total_orders ?? 0).toLocaleString()} icon={ShoppingBag} color="text-orange-700" />
        <StatCard label="Completed Orders" value={(summary?.completed_orders ?? 0).toLocaleString()} icon={BadgeCheck} color="text-emerald-700" />
        <StatCard label="Total Prescriptions" value={(summary?.total_prescriptions ?? 0).toLocaleString()} icon={FileText} color="text-indigo-700" />
        <StatCard label="Total Patients" value={(summary?.total_patients ?? 0).toLocaleString()} icon={Users} color="text-blue-700" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Fulfillment Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fulfillmentRate}%</p>
          <ProgressBar value={fulfillmentRate} className="mt-2" color="bg-emerald-500" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Available Revenue (RWF)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatRWF(summary?.available_revenue_net ?? 0)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending withdrawals: {summary?.pending_withdrawals ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Pending Orders</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {orders.filter((o) => o.order_status === "pending").length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting confirmation</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">In Transit</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {orders.filter((o) => o.order_status === "in_transit").length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active deliveries</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Order Trends</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Last 14 days — total vs completed orders</p>
            </div>
            <Badge variant="success">Live</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ordersChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} fill="url(#gradOrders)" name="Total Orders" />
                <Area type="monotone" dataKey="completed" stroke="#1e9e68" strokeWidth={2} fill="url(#gradCompleted)" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (K RWF)</CardTitle>
            <p className="text-xs text-slate-400">From completed orders</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="revenue" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Revenue (K RWF)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: System Status + Low Stock + Pending Requests */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* System Health */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-farumasi-600" />
              <CardTitle>System Health</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total Users", value: (summary?.total_users ?? 0).toLocaleString(), icon: Users, color: "text-blue-600" },
                { label: "Pharmacies", value: summary?.total_pharmacies ?? 0, icon: ShoppingBag, color: "text-purple-600" },
                { label: "Active Riders", value: summary?.total_riders ?? 0, icon: Truck, color: "text-teal-600" },
                { label: "Pending Orders", value: orders.filter(o => o.order_status === "pending").length, icon: ClipboardList, color: "text-amber-600" },
                { label: "Revenue Available", value: formatRWF(summary?.available_revenue_net ?? 0), icon: TrendingUp, color: "text-emerald-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    <span className="text-[12px] text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle>Low Stock Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockListings.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-4">No low stock listings detected.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {lowStockListings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                      listing.stock_quantity === 0 ? "bg-red-500" :
                      listing.stock_quantity <= 5 ? "bg-amber-500" : "bg-yellow-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">
                        {listing.product?.name ?? "Unknown Product"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {listing.pharmacy?.name ?? "—"} · {listing.stock_quantity} units
                      </p>
                    </div>
                    <Badge variant={listing.stock_quantity === 0 ? "error" : "warning"}>
                      {listing.stock_quantity === 0 ? "Out" : "Low"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Product Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              <CardTitle>Pending Requests</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRequests.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-4">No pending product requests.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-sky-600">
                        {(req.product_name ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{req.product_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {req.category ?? "General"} ·{" "}
                        {req.requester?.user?.full_name ?? "Unknown requester"}
                      </p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

