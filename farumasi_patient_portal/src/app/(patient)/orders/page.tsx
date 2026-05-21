"use client";

import { useState } from "react";
import Link from "next/link";
import { mockActiveOrders, mockPastOrders } from "@/data/mock";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { GuestGate } from "@/components/shared/guest-gate";
import { useTranslation } from "@/lib/translations";
import { Package, ChevronRight, Clock, Store } from "lucide-react";
import type { Order } from "@/types";

export default function OrdersPage() {
  const [tab, setTab] = useState<"active" | "past">("active");
  const t = useTranslation();

  return (
    <GuestGate feature="your orders">
    /* Flutter: white Scaffold, AppBar "My Orders" centered, TabBar with green indicator */
    <div className="flex flex-col h-full bg-white">

      {/* Flutter AppBar simulation — white bg, centered title */}
      <div className="flex items-center justify-center px-5 py-4 bg-white border-b border-slate-100 shrink-0">
        <h1 className="text-lg font-bold text-slate-900">{t.orders_title}</h1>
      </div>

      {/* Flutter TabBar — indicator style (underline), NOT pill/bg style */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        {(["active", "past"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors relative",
              tab === tabKey ? "text-farumasi-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tabKey === "active" ? t.orders_active : t.orders_past}
            {/* Flutter TabBar green underline indicator */}
            {tab === tabKey && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-farumasi-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "active" ? (
          mockActiveOrders.length === 0 ? (
            <EmptyOrders message={t.orders_no_active} />
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {mockActiveOrders.map((order) => <ActiveOrderCard key={order.id} order={order} />)}
            </div>
          )
        ) : (
          mockPastOrders.length === 0 ? (
            <EmptyOrders message={t.orders_no_past} />
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {mockPastOrders.map((order) => <PastOrderCard key={order.id} order={order} />)}
            </div>
          )
        )}
      </div>
    </div>
    </GuestGate>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  const t = useTranslation();
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Order #{order.id}</p>
          <p className="text-base font-bold text-slate-900">{order.pharmacy}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {order.date}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <div className="bg-slate-50 rounded-2xl p-3 mb-4">
        {order.items.split(",").map((item, i) => (
          <div key={i} className="flex items-center text-sm py-1">
            <span className="text-slate-700">{item.trim()}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{t.cart_total}</p>
          <p className="text-lg font-extrabold text-farumasi-700">{order.total}</p>
        </div>
        <Link
          href={`/orders/${order.id}`}
          className="flex items-center gap-2 bg-farumasi-600 hover:bg-farumasi-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-colors"
        >
          {t.orders_track}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function PastOrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`}>
      <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center gap-4 hover:shadow-sm hover:border-farumasi-200 transition-all">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">{order.pharmacy}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.items} · {order.date}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-900">{order.total}</p>
          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto mt-1" />
        </div>
      </div>
    </Link>
  );
}

function EmptyOrders({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Package className="w-16 h-16 text-slate-200 mb-4" />
      <p className="text-slate-600 font-semibold">{message}</p>
      <Link href="/store" className="mt-4 inline-flex items-center gap-2 text-sm text-farumasi-600 font-medium hover:underline">
        <Store className="w-4 h-4" />
        Browse medicines
      </Link>
    </div>
  );
}
