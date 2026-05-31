"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Truck,
  ChevronRight,
  CreditCard,
  Loader2,
  X,
  UserPlus,
  Key,
  Package,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { BackendOrder } from "@/lib/services/orders.service";
import { ordersService } from "@/lib/services/orders.service";
import { ridersService, type RiderProfile } from "@/lib/services/riders.service";

// ─── Status progression for DELIVERY orders only ─────────────────────────
// Pharmacist takes over after partner pharmacy marks ready_for_pickup.
const DELIVERY_STATUS: Partial<Record<string, string>> = {
  ready_for_pickup: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered:        "completed",
};
const DELIVERY_LABEL: Partial<Record<string, string>> = {
  ready_for_pickup: "Dispatch for Delivery",
  out_for_delivery: "Mark Delivered",
  delivered:        "Complete Order",
};

// Pickup orders have no pharmacist-driven steps — the partner pharmacy verifies
// the patient's access code at the counter and the order completes there.

const FINAL_STATUSES = new Set(["delivered", "cancelled", "rejected", "completed"]);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder]       = useState<BackendOrder | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Advance/reject
  const [advancing, setAdvancing] = useState(false);

  // Rider assignment
  const [riders, setRiders]               = useState<RiderProfile[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [showRiderPanel, setShowRiderPanel] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Rider access code
  const [showRiderCodePanel, setShowRiderCodePanel] = useState(false);
  const [riderCodeInput, setRiderCodeInput] = useState("");
  const [settingRiderCode, setSettingRiderCode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersService.getOrderById(id);
      setOrder(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived state ───────────────────────────────────────────────────────
  const status       = order?.order_status ?? "";
  const isDelivery   = order?.delivery_method === "delivery" || !!order?.delivery_address;
  const isFinal      = FINAL_STATUSES.has(status);
  const hasDelivery  = !!order?.delivery?.id;
  const hasRider     = !!order?.delivery?.rider?.user?.full_name;
  const hasRiderCode = !!order?.rider_access_code;

  // Pharmacist can advance only delivery orders (pickup is owned by partner portal)
  const canAdvanceDelivery =
    isDelivery && !isFinal && !!DELIVERY_STATUS[status];

  // Show rider panel for delivery orders that don't have a rider yet
  const canAssignRider =
    isDelivery &&
    hasDelivery &&
    !hasRider &&
    ["pending", "accepted", "preparing", "ready_for_pickup"].includes(status);

  // Show rider code panel when delivery is ready_for_pickup and rider is assigned
  const canSetRiderCode =
    isDelivery && hasRider && !hasRiderCode && status === "ready_for_pickup";

  // ── Load riders when rider panel is opened ──────────────────────────────
  const openRiderPanel = async () => {
    setShowRiderPanel(true);
    if (riders.length > 0) return;
    setLoadingRiders(true);
    try {
      const list = await ridersService.listRiders(true);
      setRiders(list);
    } catch {
      toast.error("Could not load riders list");
    } finally {
      setLoadingRiders(false);
    }
  };

  // ── Advance status ──────────────────────────────────────────────────────
  const advanceStatus = async () => {
    if (!order) return;
    const next = DELIVERY_STATUS[order.order_status];
    if (!next) return;
    // Guard: ensure rider + code are set before dispatching
    if (status === "ready_for_pickup" && (!hasRider || !hasRiderCode)) {
      toast.error("Assign a rider and set a rider code before dispatching");
      return;
    }
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

  // ── Assign rider ────────────────────────────────────────────────────────
  const assignRider = async () => {
    if (!order?.delivery?.id || !selectedRiderId) return;
    setAssigning(true);
    try {
      await ordersService.assignDelivery(order.delivery.id, selectedRiderId);
      toast.success("Rider assigned");
      setShowRiderPanel(false);
      setSelectedRiderId("");
      await load();
    } catch {
      toast.error("Could not assign rider");
    } finally {
      setAssigning(false);
    }
  };

  // ── Set rider access code ───────────────────────────────────────────────
  const setRiderCode = async () => {
    if (!order || !riderCodeInput.trim()) return;
    setSettingRiderCode(true);
    try {
      const updated = await ordersService.setRiderCode(order.id, riderCodeInput.trim());
      setOrder(updated);
      toast.success("Rider access code saved");
      setShowRiderCodePanel(false);
      setRiderCodeInput("");
    } catch {
      toast.error("Could not set rider code");
    } finally {
      setSettingRiderCode(false);
    }
  };

  // ── Loading / not-found states ──────────────────────────────────────────
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
        <button
          onClick={() => router.back()}
          className="text-farumasi-600 font-medium hover:underline mt-2 inline-block"
        >
          Go Back
        </button>
      </div>
    );
  }

  const riderName = order.delivery?.rider?.user?.full_name;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
            Order{" "}
            {order.order_code
              ? `#${order.order_code}`
              : `#${order.id.slice(-8).toUpperCase()}`}
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">
            {order.patient?.user?.full_name ?? "Unknown Patient"}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5" />
            {order.patient?.user?.phone ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Delivery Address</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {order.delivery_address}
            </p>
          </div>
        </div>
      )}

      {/* Pickup badge */}
      {!isDelivery && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Fulfilment</p>
            <p className="text-sm font-semibold text-slate-900">
              Pickup — managed by partner pharmacy
            </p>
          </div>
        </div>
      )}

      {/* Payment */}
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

      {/* Assigned rider */}
      {riderName && (
        <div className="bg-farumasi-50 rounded-2xl border border-farumasi-100 p-4 mb-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-farumasi-600 shrink-0" />
          <div>
            <p className="text-xs text-farumasi-700">Rider Assigned</p>
            <p className="text-sm font-bold text-farumasi-900">{riderName}</p>
          </div>
        </div>
      )}

      {/* Rider access code badge */}
      {order.rider_access_code && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mb-4 flex items-center gap-3">
          <Key className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs text-amber-700">Rider Access Code</p>
            <p className="text-sm font-bold text-amber-900 tracking-widest">
              {order.rider_access_code}
            </p>
          </div>
        </div>
      )}

      {/* Patient access code (visible to pharmacist for reference) */}
      {order.patient_access_code && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Patient Access Code</p>
            <p className="text-sm font-bold text-slate-700 tracking-widest">
              {order.patient_access_code}
            </p>
          </div>
        </div>
      )}

      {/* Rider assignment panel */}
      {canAssignRider && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          {showRiderPanel ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-farumasi-600" />
                Assign a Rider
              </p>
              {loadingRiders ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-farumasi-600" />
                </div>
              ) : riders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">
                  No online riders available right now.
                </p>
              ) : (
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300 bg-white"
                >
                  <option value="">Select a rider…</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.user?.full_name ?? r.user_id} ·{" "}
                      {r.vehicle_type ?? r.rider_type}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  onClick={assignRider}
                  disabled={assigning || !selectedRiderId}
                  className="flex-1 h-10 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {assigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm Rider"
                  )}
                </button>
                <button
                  onClick={() => setShowRiderPanel(false)}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={openRiderPanel}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-farumasi-600 hover:text-farumasi-700 transition-colors py-1"
            >
              <UserPlus className="w-4 h-4" />
              Assign Rider
            </button>
          )}
        </div>
      )}

      {/* Rider access code panel */}
      {canSetRiderCode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          {showRiderCodePanel ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                Set Rider Code
              </p>
              <p className="text-xs text-slate-500">
                The rider will show this code at the pharmacy counter to collect
                the medicines.
              </p>
              <input
                type="text"
                value={riderCodeInput}
                onChange={(e) => setRiderCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. RIDER-7492"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={setRiderCode}
                  disabled={settingRiderCode || !riderCodeInput.trim()}
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {settingRiderCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Code"
                  )}
                </button>
                <button
                  onClick={() => setShowRiderCodePanel(false)}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRiderCodePanel(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors py-1"
            >
              <Key className="w-4 h-4" />
              Set Rider Access Code
            </button>
          )}
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Order Items</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.product_name}
                </p>
                <p className="text-xs text-slate-500">
                  Qty: {item.quantity} × {formatPrice(item.unit_price)} RWF
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {formatPrice(item.total_price)} RWF
              </p>
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

      {/* Action buttons — delivery orders only */}
      {canAdvanceDelivery && (
        <div className="flex flex-col gap-3">
          <button
            onClick={advanceStatus}
            disabled={advancing}
            className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            {advancing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {DELIVERY_LABEL[status]}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Pickup info — no action needed from pharmacist */}
      {!isDelivery && !isFinal && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-500">
            Pickup orders are completed at the pharmacy counter when the patient
            presents their access code.
          </p>
        </div>
      )}
    </div>
  );
}
