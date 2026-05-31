"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw, PackageCheck, Clock, Bike } from "lucide-react";
import api from "@/lib/api";

interface DeliveryItem {
  id: string;
  status: string;
  created_at: string;
  order?: {
    id: string;
    order_code?: string;
    delivery_address?: string;
    patient?: { full_name?: string; phone?: string };
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
  qr_pending: "QR Pending",
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

const ACTIVE = new Set([
  "assigned",
  "accepted",
  "going_to_pickup",
  "arrived_at_pickup",
  "picked_up",
  "out_for_delivery",
  "arrived_at_destination",
  "qr_pending",
]);

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/deliveries/");
      setDeliveries(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === "active"
      ? deliveries.filter((d) => ACTIVE.has(d.status))
      : deliveries;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-farumasi-600 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5" />
          <span className="font-bold text-lg">My Deliveries</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-1.5 rounded-full hover:bg-farumasi-700 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("farumasi_rider_token");
              localStorage.removeItem("farumasi_rider_refresh");
              window.location.href = "/login";
            }}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4">
        {(["active", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition ${
              tab === t
                ? "border-farumasi-600 text-farumasi-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "active" ? "Active" : "All"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <p className="text-center text-slate-400 text-sm py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <PackageCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-slate-400 text-sm">No deliveries found</p>
          </div>
        ) : (
          filtered.map((d) => (
            <Link
              key={d.id}
              href={`/deliveries/${d.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:border-farumasi-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {d.order?.order_code ?? d.order?.id?.slice(0, 8) ?? d.id.slice(0, 8)}
                  </p>
                  {d.order?.patient?.full_name && (
                    <p className="text-xs text-slate-500 truncate">
                      {d.order.patient.full_name}
                    </p>
                  )}
                  {d.order?.delivery_address && (
                    <p className="text-xs text-slate-400 truncate">
                      📍 {d.order.delivery_address}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_COLOR[d.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {new Date(d.created_at).toLocaleString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
