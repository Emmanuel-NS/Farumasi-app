"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockOrders, mockDrivers } from "@/data/mock";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Phone, MapPin, Truck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/types";

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready_for_pickup",
  ready_for_pickup: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark Ready for Pickup",
  ready_for_pickup: "Assign Driver & Dispatch",
  out_for_delivery: "Mark Delivered",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState(mockOrders);
  const [selectedDriver, setSelectedDriver] = useState<string>("");

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Order not found.</p>
        <button onClick={() => router.back()} className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Go Back
        </button>
      </div>
    );
  }

  const advanceStatus = () => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (order.status === "ready_for_pickup" && !selectedDriver) {
      toast.error("Please select a driver first");
      return;
    }
    const driver = mockDrivers.find((d) => d.id === selectedDriver);
    setOrders((p) => p.map((o) =>
      o.id === id
        ? { ...o, status: next, updatedAt: new Date().toISOString(), driverId: driver?.id, driverName: driver?.name }
        : o
    ));
    toast.success(`Order moved to ${next.replace(/_/g, " ")}`);
  };

  const isFinal = order.status === "delivered" || order.status === "cancelled" || order.status === "failed";
  const canAdvance = !isFinal && !!NEXT_STATUS[order.status];
  const availableDrivers = mockDrivers.filter((d) => d.status === "available");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Order #{order.id}</p>
          <h1 className="text-xl font-extrabold text-slate-900">{order.patientName}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5" />
            {order.patientPhone}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Delivery Address</p>
            <p className="text-sm font-semibold text-slate-900">{order.deliveryAddress}</p>
          </div>
        </div>
      )}

      {/* Driver info */}
      {order.driverName && (
        <div className="bg-farumasi-50 rounded-2xl border border-farumasi-100 p-4 mb-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-farumasi-700">Driver Assigned</p>
            <p className="text-sm font-bold text-farumasi-900">{order.driverName}</p>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Order Items</h2>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.medicineName}</p>
                <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatPrice(item.unitPrice)} RWF</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatPrice(item.totalPrice)} RWF</p>
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <span className="font-bold text-slate-900 text-sm">Total</span>
            <span className="font-extrabold text-farumasi-700 text-base">{formatPrice(order.totalAmount)} RWF</span>
          </div>
        </div>
      </div>

      {/* Driver selector (when ready for pickup) */}
      {order.status === "ready_for_pickup" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Assign a Driver</h2>
          <div className="space-y-2">
            {availableDrivers.length === 0 ? (
              <p className="text-sm text-slate-500">No drivers available right now.</p>
            ) : (
              availableDrivers.map((d) => (
                <label key={d.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${selectedDriver === d.id ? "border-farumasi-500 bg-farumasi-50" : "border-slate-200 hover:border-farumasi-300"}`}>
                  <input type="radio" name="driver" value={d.id} checked={selectedDriver === d.id} onChange={() => setSelectedDriver(d.id)} className="sr-only" />
                  <div className="w-9 h-9 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-sm shrink-0">
                    {d.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{d.vehicleType} · {d.vehiclePlate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-farumasi-600">⭐ {d.rating}</p>
                    <p className="text-[10px] text-slate-400">{d.totalDeliveries} deliveries</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      {canAdvance && (
        <button
          onClick={advanceStatus}
          className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
        >
          {NEXT_LABEL[order.status]}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
