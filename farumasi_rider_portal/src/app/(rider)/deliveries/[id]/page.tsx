"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, QrCode, Phone } from "lucide-react";
import api from "@/lib/api";

interface DeliveryDetail {
  id: string;
  status: string;
  created_at: string;
  order?: {
    id: string;
    order_code?: string;
    delivery_address?: string;
    delivery_notes?: string;
    items?: { id: string; medication_name?: string; quantity: number }[];
    patient?: { full_name?: string; phone?: string };
    pharmacy?: { name?: string; address?: string };
  };
}

const STATUS_LABEL: Record<string, string> = {
  pending_assignment: "Pending Assignment",
  assigned: "Assigned",
  accepted: "Accepted",
  going_to_pickup: "Going to Pickup",
  arrived_at_pickup: "Arrived at Pickup",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  arrived_at_destination: "At Destination",
  qr_pending: "Awaiting QR Scan",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending_assignment: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  accepted: "bg-blue-100 text-blue-800",
  going_to_pickup: "bg-indigo-100 text-indigo-800",
  arrived_at_pickup: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  arrived_at_destination: "bg-orange-100 text-orange-800",
  qr_pending: "bg-pink-100 text-pink-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};

// Maps current status → next button action
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  assigned: { status: "accept", label: "Accept Delivery" },
  accepted: { status: "going_to_pickup", label: "Going to Pickup" },
  going_to_pickup: { status: "arrived_at_pickup", label: "Arrived at Pickup" },
  arrived_at_pickup: { status: "picked_up", label: "Picked Up" },
  picked_up: { status: "out_for_delivery", label: "Out for Delivery" },
  out_for_delivery: { status: "arrived_at_destination", label: "Arrived at Destination" },
  arrived_at_destination: { status: "qr_pending", label: "Request QR Scan" },
};

const TERMINAL = new Set(["delivered", "failed", "cancelled", "pending_assignment"]);

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [confirmingQr, setConfirmingQr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/deliveries/${id}`);
      setDelivery(data);
    } catch {
      toast.error("Failed to load delivery");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance() {
    if (!delivery) return;
    const next = NEXT_STATUS[delivery.status];
    if (!next) return;
    setAdvancing(true);
    try {
      if (next.status === "accept") {
        await api.patch(`/deliveries/${id}/accept`);
      } else {
        await api.patch(`/deliveries/${id}/status`, { status: next.status });
      }
      toast.success("Status updated");
      await load();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setAdvancing(false);
    }
  }

  async function confirmQr() {
    if (!qrToken.trim()) {
      toast.error("Enter the QR token");
      return;
    }
    setConfirmingQr(true);
    try {
      await api.post(`/deliveries/${id}/confirm-qr`, { qr_token: qrToken.trim() });
      toast.success("Delivery confirmed!");
      setQrToken("");
      await load();
    } catch {
      toast.error("QR confirmation failed");
    } finally {
      setConfirmingQr(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-500 text-sm">Delivery not found.</p>
      </div>
    );
  }

  const next = NEXT_STATUS[delivery.status];
  const isTerminal = TERMINAL.has(delivery.status);
  const isQrPending = delivery.status === "qr_pending";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-farumasi-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-farumasi-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-base leading-tight">
            {delivery.order?.order_code ?? delivery.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-farumasi-100">Delivery detail</p>
        </div>
        <span
          className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_COLOR[delivery.status] ?? "bg-white/20 text-white"
          }`}
        >
          {STATUS_LABEL[delivery.status] ?? delivery.status}
        </span>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Customer */}
        {delivery.order?.patient && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Customer
            </h2>
            <p className="font-semibold text-slate-800">
              {delivery.order.patient.full_name ?? "—"}
            </p>
            {delivery.order.patient.phone && (
              <a
                href={`tel:${delivery.order.patient.phone}`}
                className="inline-flex items-center gap-1.5 text-farumasi-600 text-sm font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                {delivery.order.patient.phone}
              </a>
            )}
            {delivery.order.delivery_address && (
              <p className="text-sm text-slate-500 mt-1">
                📍 {delivery.order.delivery_address}
              </p>
            )}
            {delivery.order.delivery_notes && (
              <p className="text-xs text-slate-400 italic">
                Note: {delivery.order.delivery_notes}
              </p>
            )}
          </div>
        )}

        {/* Pickup pharmacy */}
        {delivery.order?.pharmacy && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Pickup From
            </h2>
            <p className="font-semibold text-slate-800">
              {delivery.order.pharmacy.name ?? "Pharmacy"}
            </p>
            {delivery.order.pharmacy.address && (
              <p className="text-sm text-slate-500">
                📍 {delivery.order.pharmacy.address}
              </p>
            )}
          </div>
        )}

        {/* Order items */}
        {delivery.order?.items && delivery.order.items.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Items
            </h2>
            <ul className="space-y-1.5">
              {delivery.order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-slate-700">
                  <span>{item.medication_name ?? item.id.slice(0, 8)}</span>
                  <span className="text-slate-400">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status action */}
        {!isTerminal && (
          <div className="space-y-3">
            {/* Advance button */}
            {next && (
              <button
                onClick={advance}
                disabled={advancing}
                className="w-full py-3 bg-farumasi-600 hover:bg-farumasi-700 text-white font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {advancing ? "Updating…" : next.label}
              </button>
            )}

            {/* QR confirm panel */}
            {isQrPending && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-farumasi-600" />
                  <h2 className="font-semibold text-slate-800 text-sm">
                    Confirm Delivery by QR
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Ask the customer to show their QR code and enter the token below.
                </p>
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="QR token"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
                <button
                  onClick={confirmQr}
                  disabled={confirmingQr}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
                >
                  {confirmingQr ? "Confirming…" : "Confirm Delivery"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Terminal state banner */}
        {isTerminal && (
          <div
            className={`rounded-xl p-4 text-center text-sm font-semibold ${
              delivery.status === "delivered"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {delivery.status === "delivered"
              ? "✓ Delivery completed"
              : `Delivery ${STATUS_LABEL[delivery.status] ?? delivery.status}`}
          </div>
        )}
      </div>
    </div>
  );
}
