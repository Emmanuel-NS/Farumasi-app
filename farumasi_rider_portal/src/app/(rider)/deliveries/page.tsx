"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RefreshCw,
  PackageCheck,
  Clock,
  Bike,
  Wallet,
  Circle,
} from "lucide-react";
import { riderService, type RiderDelivery } from "@/lib/services/rider.service";
import { RiderBottomNav } from "@/components/rider-bottom-nav";

const STATUS_LABEL: Record<string, string> = {
  pending_assignment: "Pending",
  assigned: "New assignment",
  accepted: "Accepted",
  going_to_pickup: "Going to pickup",
  arrived_at_pickup: "At pharmacy",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  arrived_at_destination: "At destination",
  qr_pending: "Scan QR",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
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
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "all">("active");
  const [online, setOnline] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, profile] = await Promise.all([
        riderService.listDeliveries(),
        riderService.getProfile().catch(() => null),
      ]);
      setDeliveries(list);
      if (profile) setOnline(profile.availability_status === "online");
    } catch {
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function toggleOnline() {
    setToggling(true);
    const next = online ? "offline" : "online";
    try {
      await riderService.setAvailability(next);
      setOnline(next === "online");
      toast.success(next === "online" ? "You are online for deliveries" : "You are offline");
    } catch {
      toast.error("Could not update availability");
    } finally {
      setToggling(false);
    }
  }

  const filtered =
    tab === "active" ? deliveries.filter((d) => ACTIVE.has(d.status)) : deliveries;

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24">
      <header className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-farumasi-600 flex items-center justify-center text-white">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Deliveries</h1>
              <p className="text-xs text-slate-500">FARUMASI Rider</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleOnline()}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                online
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              <Circle className={`w-2 h-2 fill-current ${online ? "text-emerald-500" : "text-slate-400"}`} />
              {online ? "Online" : "Offline"}
            </button>
            <button type="button" onClick={() => void load()} className="p-2 rounded-lg hover:bg-slate-100">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
          {(["active", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition ${
                tab === t ? "bg-farumasi-600 text-white" : "text-slate-500"
              }`}
            >
              {t === "active" ? "Active" : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <p className="text-center text-slate-400 text-sm py-12">Loading deliveries…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-slate-100">
            <PackageCheck className="w-12 h-12 mx-auto text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">No deliveries right now</p>
            <p className="text-xs text-slate-400 px-8">
              {online
                ? "New assignments will appear here when pharmacies mark orders ready."
                : "Go online to receive delivery assignments."}
            </p>
          </div>
        ) : (
          filtered.map((d) => (
            <Link
              key={d.id}
              href={`/deliveries/${d.id}`}
              className="block bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-farumasi-300 transition"
            >
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {d.order?.order_code ?? d.order_id.slice(0, 8)}
                  </p>
                  {d.order?.patient?.full_name && (
                    <p className="text-sm text-slate-600 truncate">{d.order.patient.full_name}</p>
                  )}
                  <p className="text-xs text-slate-400 truncate mt-1">
                    {d.destination_address ?? d.order?.delivery_address ?? "—"}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-farumasi-50 text-farumasi-700">
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(d.created_at).toLocaleString()}
                </span>
                {d.rider_earning != null && (
                  <span className="font-semibold text-farumasi-700">
                    RWF {Math.round(d.rider_earning).toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      <RiderBottomNav />
    </div>
  );
}
