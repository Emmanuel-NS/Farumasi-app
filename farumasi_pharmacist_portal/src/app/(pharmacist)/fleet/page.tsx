"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Truck, Phone, MapPin, Package, Loader2, RefreshCw, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  fleetService,
  type BackendPharmacyDriver,
  type BackendDelivery,
  type RiderAvailability,
} from "@/lib/services/fleet.service";

const TABS = [
  { id: "active",  label: "Active Deliveries" },
  { id: "drivers", label: "Drivers" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const AVAIL_COLORS: Record<RiderAvailability, string> = {
  available: "bg-green-100 text-green-700",
  busy:      "bg-blue-100 text-blue-700",
  offline:   "bg-slate-100 text-slate-500",
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pending_assignment: "bg-amber-100 text-amber-700",
  assigned:           "bg-sky-100 text-sky-700",
  accepted:           "bg-blue-100 text-blue-700",
  in_progress:        "bg-indigo-100 text-indigo-700",
  picked_up:          "bg-purple-100 text-purple-700",
  delivered:          "bg-green-100 text-green-700",
  cancelled:          "bg-red-100 text-red-700",
  rejected:           "bg-red-100 text-red-700",
};

const ACTIVE_STATUSES = new Set([
  "pending_assignment", "assigned", "accepted", "in_progress", "picked_up",
]);

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function FleetPage() {
  const [tab, setTab]               = useState<Tab>("active");
  const [drivers, setDrivers]       = useState<BackendPharmacyDriver[]>([]);
  const [deliveries, setDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading]       = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([fleetService.listDrivers(), fleetService.listDeliveries()])
      .then(([d, del]) => { setDrivers(d); setDeliveries(del); })
      .catch(() => toast.error("Failed to load fleet data"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activeDeliveries  = deliveries.filter((d) => ACTIVE_STATUSES.has(d.status));
  const historyDeliveries = deliveries.filter((d) => !ACTIVE_STATUSES.has(d.status));
  const activeDriverCount = drivers.filter((d) => d.availability_status !== "offline").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeDriverCount} driver{activeDriverCount !== 1 ? "s" : ""} active · {activeDeliveries.length} live deliver{activeDeliveries.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
            {t.id === "active" && activeDeliveries.length > 0 && (
              <span className="ml-1.5 bg-farumasi-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {activeDeliveries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto" /></div>
      ) : tab === "drivers" ? (
        <DriverList drivers={drivers} />
      ) : tab === "active" ? (
        <DeliveryList items={activeDeliveries} emptyText="No active deliveries" drivers={drivers} />
      ) : (
        <DeliveryList items={historyDeliveries} emptyText="No delivery history yet" drivers={drivers} />
      )}
    </div>
  );
}

function DriverList({ drivers }: { drivers: BackendPharmacyDriver[] }) {
  if (drivers.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
        <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No drivers have delivered for this pharmacy yet</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {drivers.map((d) => (
        <div key={d.rider_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-farumasi-50 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-farumasi-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">{d.full_name}</p>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", AVAIL_COLORS[d.availability_status])}>
                  {d.availability_status}
                </span>
              </div>
              {d.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {d.phone}</p>
              )}
              {d.vehicle_type && (
                <p className="text-xs text-slate-500 mt-0.5">{d.vehicle_type}{d.assigned_area ? ` · ${d.assigned_area}` : ""}</p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <Stat label="Deliveries" value={d.deliveries_count} />
            <Stat label="Completed" value={d.completed_count} />
            <Stat label="Last" value={d.last_delivery_at ? new Date(d.last_delivery_at).toLocaleDateString() : "—"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function DeliveryList({
  items, emptyText, drivers,
}: { items: BackendDelivery[]; emptyText: string; drivers: BackendPharmacyDriver[] }) {
  const riderName = (rider_id: string | null) => {
    if (!rider_id) return "Unassigned";
    return drivers.find((d) => d.rider_id === rider_id)?.full_name ?? rider_id.slice(0, 8);
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
        <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-farumasi-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900">#{d.order_id.slice(-6).toUpperCase()}</p>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                DELIVERY_STATUS_COLORS[d.status] ?? "bg-slate-100 text-slate-600",
              )}>{d.status.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Rider: <span className="text-slate-700 font-medium">{riderName(d.rider_id)}</span></p>
            {d.destination_address && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {d.destination_address}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Created {formatDate(d.created_at)}{d.delivered_at ? ` · Delivered ${formatDate(d.delivered_at)}` : ""}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-slate-900">{d.delivery_fee.toLocaleString()} <span className="text-[10px] text-slate-400">RWF</span></p>
            <p className="text-[10px] text-slate-400">fee</p>
          </div>
        </div>
      ))}
    </div>
  );
}
