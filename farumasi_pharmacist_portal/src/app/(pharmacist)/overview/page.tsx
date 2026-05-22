"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { ShoppingBag, FileText, DollarSign, Package, Truck, ChevronRight, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { prescriptionsService, type BackendPrescription } from "@/lib/services/prescriptions.service";
import { toast } from "sonner";

const weeklyData = [
  { day: "Mon", orders: 12, revenue: 5000 },
  { day: "Tue", orders: 18, revenue: 8000 },
  { day: "Wed", orders: 9,  revenue: 4000 },
  { day: "Thu", orders: 24, revenue: 12000 },
  { day: "Fri", orders: 30, revenue: 15000 },
  { day: "Sat", orders: 36, revenue: 18000 },
  { day: "Sun", orders: 21, revenue: 11000 },
];

export default function OverviewPage() {
  const [orders, setOrders]             = useState<BackendOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<BackendPrescription[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      ordersService.getPharmacyOrders({ limit: 10 }),
      prescriptionsService.getAll({ limit: 50 }),
    ])
      .then(([ordersRes, rxRes]) => {
        setOrders(ordersRes.items);
        setPrescriptions(rxRes.items);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  const recentOrders   = orders.slice(0, 4);
  const activeRequests = prescriptions.filter(
    (r) => r.status === "draft" || r.status === "active" || r.status === "under_review"
  );
  const pendingOrders  = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
  const totalRevenue   = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-RW", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Active Orders"    value={pendingOrders}                                                icon={ShoppingBag} color="green"  trend="" trendUp />
        <StatCard title="New Requests"     value={activeRequests.length}                                       icon={FileText}    color="orange" trend="" trendUp />
        <StatCard title="Total Revenue"    value={`RWF ${(totalRevenue / 1000).toFixed(0)}K`}                  icon={DollarSign}  color="blue"   trend="" trendUp />
        <StatCard title="Orders (Total)"   value={orders.length}                                               icon={Package}     color="red" />
        <StatCard title="Prescriptions"    value={prescriptions.length}                                        icon={Truck}       color="purple" />
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Weekly Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Orders &amp; Revenue — This Week</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-farumasi-600 font-semibold bg-farumasi-50 px-3 py-1.5 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" />
            This Week
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.08)", fontSize: 12 }}
              formatter={(v: number, name: string) =>
                name === "revenue" ? [`RWF ${v.toLocaleString()}`, "Revenue"] : [v, "Orders"]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="orders"  stroke="#1e9e68" strokeWidth={2.5} dot={{ r: 4, fill: "#1e9e68" }} activeDot={{ r: 6 }} name="orders" />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} name="revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pending Prescription Reviews */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pending Prescription Reviews</h2>
            <p className="text-xs text-slate-400 mt-0.5">Prescriptions awaiting pharmacist safety review</p>
          </div>
          <Link href="/requests" className="text-xs text-farumasi-600 font-medium hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {activeRequests.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {activeRequests.slice(0, 4).map((req) => (
              <Link
                key={req.id}
                href="/requests"
                className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(req.patient?.user?.full_name ?? "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{req.patient?.user?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-amber-700 font-medium">
                    {req.items.length} item{req.items.length !== 1 ? "s" : ""} · Awaiting review
                  </p>
                  <p className="text-[11px] text-slate-400">{formatDate(req.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No pending prescription reviews</p>
          </div>
        )}
      </div>

      {/* Recent Orders + Active Requests */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-farumasi-600 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4 text-farumasi-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{order.patient?.user?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-400">#{order.id.slice(-6).toUpperCase()} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={order.status} />
                  <p className="text-xs text-slate-500 mt-1">{formatPrice(order.total_amount)} RWF</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Requests */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Active Requests</h2>
            <Link href="/requests" className="text-xs text-farumasi-600 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {activeRequests.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{req.patient?.user?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">#{req.id.slice(-6).toUpperCase()} · {req.items.length} item{req.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={req.status} type="request" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

