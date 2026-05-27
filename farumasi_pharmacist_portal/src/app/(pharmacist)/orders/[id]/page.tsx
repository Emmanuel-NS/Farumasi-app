"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Phone, MapPin, Truck, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { BackendOrder } from "@/lib/services/orders.service";
import { ordersService } from "@/lib/services/orders.service";
import type { OrderStatus } from "@/types";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready_for_pickup",
  ready_for_pickup: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark Ready for Pickup",
  ready_for_pickup: "Dispatch for Delivery",
  out_for_delivery: "Mark Delivered",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<BackendOrder>(`/orders/${id}`);
      setOrder(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const advanceStatus = async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status as OrderStatus];
    if (!next) return;
    setAdvancing(true);
    try {
      const updated = await ordersService.updateStatus(order.id, next);
      setOrder(updated);
      toast.success(`Order moved to ${next.replace(/_/g, " ")}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-farumasi-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Order not found.</p>
        <button onClick={() => router.back()} className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Go Back
        </button>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const isFinal = status === "delivered" || status === "cancelled" || status === "failed";
  const canAdvance = !isFinal && !!NEXT_STATUS[status];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">
            {order.patient?.user?.full_name ?? "Unknown Patient"}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5" />
            {order.patient?.user?.phone ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.delivery_address && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Delivery Address</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{order.delivery_address}</p>
          </div>
        </div>
      )}

      {order.payment_method && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Payment</p>
            <p className="text-sm font-semibold text-slate-900 capitalize">
              {order.payment_method.replace(/_/g, " ")} · {order.payment_status}
            </p>
          </div>
        </div>
      )}

      {order.rider?.user?.full_name && (
        <div className="bg-farumasi-50 rounded-2xl border border-farumasi-100 p-4 mb-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-farumasi-700">Driver Assigned</p>
            <p className="text-sm font-bold text-farumasi-900">{order.rider.user.full_name}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Order Items</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.product?.name ?? "Item"}</p>
                <p className="text-xs text-slate-500">
                  Qty: {item.quantity} × {formatPrice(item.unit_price)} RWF
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatPrice(item.total_price)} RWF</p>
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <span className="font-bold text-slate-900 text-sm">Total</span>
            <span className="font-extrabold text-farumasi-700 text-base">
              {formatPrice(order.total_amount)} RWF
            </span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5">
          <p className="text-xs text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-900">{order.notes}</p>
        </div>
      )}

      {canAdvance && (
        <button
          onClick={advanceStatus}
          disabled={advancing}
          className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold transition-colors flex items-center justify-center gap-2"
        >
          {advancing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {NEXT_LABEL[status]}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
