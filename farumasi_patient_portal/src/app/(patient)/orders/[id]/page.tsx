"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockActiveOrders, mockPastOrders } from "@/data/mock";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, MapPin, Phone, MessageCircle, Package, Store, Clock, CheckCircle } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: "📋" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "🏥" },
  { key: "ready_for_pickup", label: "Ready", icon: "📦" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
  { key: "delivered", label: "Delivered", icon: "🏠" },
];

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const allOrders = [...mockActiveOrders, ...mockPastOrders];
  const order = allOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Order not found.</p>
        <button onClick={() => router.push("/orders")} className="text-farumasi-600 font-medium hover:underline mt-2 block mx-auto">
          Back to Orders
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled" || order.status === "failed";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Order #{order.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{order.pharmacyName} · {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Map placeholder */}
      {order.status === "out_for_delivery" && (
        <div className="bg-farumasi-50 border border-farumasi-100 rounded-3xl h-52 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
          {/* Fake map pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,#1e9e68_1px,transparent_1px)] bg-[length:32px_32px]" />
          <MapPin className="w-12 h-12 text-farumasi-600 mb-2" />
          <p className="text-sm font-semibold text-farumasi-800">Driver en route</p>
          <p className="text-xs text-farumasi-600 mt-0.5">Kigali, Rwanda</p>
        </div>
      )}

      {/* Delivery driver (only when out for delivery) */}
      {order.status === "out_for_delivery" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-base shrink-0">
            JK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Jean Kayitare</p>
            <p className="text-xs text-slate-500">Your delivery driver</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
              <Phone className="w-4 h-4 text-farumasi-600" />
            </button>
            <button className="w-10 h-10 rounded-full bg-farumasi-50 border border-farumasi-200 flex items-center justify-center hover:bg-farumasi-100 transition-colors">
              <MessageCircle className="w-4 h-4 text-farumasi-600" />
            </button>
          </div>
        </div>
      )}

      {/* Status timeline */}
      {!isCancelled ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Order Progress</h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const active = i === currentStepIndex;
              const last = i === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-3">
                  {/* Line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 border-2 transition-all",
                      done ? "bg-farumasi-600 border-farumasi-600" : "bg-white border-slate-200"
                    )}>
                      {done ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="text-slate-300 text-xs">{i + 1}</span>}
                    </div>
                    {!last && (
                      <div className={cn("w-0.5 flex-1 min-h-[24px] mt-1", done && i < currentStepIndex ? "bg-farumasi-500" : "bg-slate-100")} />
                    )}
                  </div>
                  {/* Label */}
                  <div className={cn("pb-5 pt-1 min-w-0 flex-1", last && "pb-0")}>
                    <p className={cn("text-sm font-semibold", active ? "text-farumasi-700" : done ? "text-slate-700" : "text-slate-400")}>
                      {step.icon} {step.label}
                    </p>
                    {active && <p className="text-xs text-farumasi-600 mt-0.5 font-medium">Current status</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-5 mb-5 text-center">
          <p className="text-red-600 font-bold text-base">Order {order.status === "cancelled" ? "Cancelled" : "Failed"}</p>
          <p className="text-sm text-red-500 mt-1">This order was not completed.</p>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-farumasi-600" />
          Order Summary
        </h2>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">{item.medicineName} <span className="text-slate-400">×{item.quantity}</span></span>
              <span className="font-medium text-slate-900">{formatPrice(item.totalPrice)} RWF</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-base font-extrabold text-farumasi-700">{formatPrice(order.totalAmount)} RWF</span>
          </div>
        </div>
      </div>

      {/* Pharmacy info */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-farumasi-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{order.pharmacyName}</p>
          <p className="text-xs text-slate-500">Kigali, Rwanda</p>
        </div>
      </div>
    </div>
  );
}
