"use client";

import { useState } from "react";
import Link from "next/link";
import { mockOrders } from "@/data/mock";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ShoppingBag, ChevronRight } from "lucide-react";
import type { OrderStatus } from "@/types";

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  const filtered = filter === "all"
    ? mockOrders
    : mockOrders.filter((o) => o.status === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage and fulfill patient medicine orders</p>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              filter === f.value
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <ShoppingBag className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">#{order.id}</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{order.patientName}</p>
                    <p className="text-xs text-slate-500">{order.patientPhone}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="bg-slate-50 rounded-2xl px-4 py-2.5 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-slate-700">{item.medicineName} <span className="text-slate-400">×{item.quantity}</span></span>
                      <span className="text-slate-600">{formatPrice(item.totalPrice)} RWF</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-farumasi-700">{formatPrice(order.totalAmount)} RWF</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.createdAt)} · {order.paymentMethod.replace(/_/g, " ")}</p>
                  </div>
                  {order.driverName && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">🚚 {order.driverName}</p>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
