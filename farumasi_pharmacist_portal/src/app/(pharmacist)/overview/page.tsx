"use client";

import Link from "next/link";
import { mockStats, mockOrders, mockRequests } from "@/data/mock";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { ShoppingBag, FileText, DollarSign, Package, Truck, ChevronRight } from "lucide-react";

export default function OverviewPage() {
  const recentOrders = mockOrders.slice(0, 4);
  const activeRequests = mockRequests.filter((r) => r.status === "broadcast" || r.status === "accepted");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-RW", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard title="Orders Today" value={mockStats.totalOrdersToday} icon={ShoppingBag} color="green" trend="+4 from yesterday" trendUp />
        <StatCard title="Pending Requests" value={mockStats.pendingRequests} icon={FileText} color="orange" />
        <StatCard title="Revenue (30d)" value={`${(mockStats.revenue30d / 1000).toFixed(0)}K`} icon={DollarSign} color="blue" trend="+12% vs last month" trendUp />
        <StatCard title="Low Stock" value={mockStats.lowStockItems} icon={Package} color="red" />
        <StatCard title="Active Drivers" value={mockStats.activeDrivers} icon={Truck} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-farumasi-600 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-farumasi-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{order.patientName}</p>
                    <p className="text-xs text-slate-400">#{order.id} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-slate-500 mt-1">{formatPrice(order.totalAmount)} RWF</p>
                  </div>
                </div>
              </Link>
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
            <div className="space-y-3">
              {activeRequests.map((req) => (
                <Link key={req.id} href={`/requests/${req.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{req.patientName}</p>
                      <p className="text-xs text-slate-400">#{req.id} · {req.items.length} item{req.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={req.status} type="request" />
                      <p className="text-xs text-slate-500 mt-1">{formatPrice(req.totalAmount)} RWF</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
