"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { mockDrivers, mockOrders } from "@/data/mock";
import { cn, formatPrice } from "@/lib/utils";
import { Truck, Phone, Star, ToggleLeft, ToggleRight, MapPin, Package, Navigation } from "lucide-react";
import type { DriverStatus } from "@/types";

/* Leaflet must be dynamically imported — it uses browser-only APIs */
const DeliveryMap = dynamic(() => import("@/components/fleet/delivery-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-center">
        <Navigation className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-slate-400">Loading map…</p>
      </div>
    </div>
  ),
});


const STATUS_COLORS: Record<DriverStatus, string> = {
  available:   "bg-green-100 text-green-700",
  on_delivery: "bg-blue-100 text-blue-700",
  off_duty:    "bg-slate-100 text-slate-500",
};

const TABS = [
  { id: "map",     label: "Live Map" },
  { id: "active",  label: "Active Deliveries" },
  { id: "drivers", label: "Drivers" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function FleetPage() {
  const [tab, setTab]             = useState<Tab>("map");
  const [drivers, setDrivers]     = useState(mockDrivers);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const cycleStatus = (id: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next: DriverStatus =
          d.status === "available" ? "off_duty" :
          d.status === "off_duty"  ? "available" : d.status;
        return { ...d, status: next };
      })
    );
  };

  const activeOrders    = mockOrders.filter((o) => o.status === "out_for_delivery");
  const historyOrders   = mockOrders.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const activeCount     = drivers.filter((d) => d.status !== "off_duty").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">{activeCount} driver{activeCount !== 1 ? "s" : ""} active</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
            {t.id === "active" && activeOrders.length > 0 && (
              <span className="ml-1.5 bg-farumasi-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {activeOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Live Map ────────────────────────────── */}
      {tab === "map" && (
        <div className="space-y-4">
          {/* Legend + Active count row */}
          <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-farumasi-500 inline-block" />
              <span className="text-xs font-semibold text-slate-600">Pharmacy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className="text-xs font-semibold text-slate-600">Active Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
              <span className="text-xs font-semibold text-slate-600">Driver Position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              <span className="text-xs font-semibold text-slate-600">Delivered</span>
            </div>
            <div className="ml-auto text-xs text-slate-400 font-medium">
              {activeOrders.length} active · {drivers.filter((d) => d.status === "on_delivery").length} on delivery
            </div>
          </div>

          {/* Map container */}
          <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-md">
            <DeliveryMap orders={mockOrders} drivers={drivers} selectedOrderId={selectedOrderId} />
          </div>

          {/* Active order cards below map */}
          {activeOrders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700 px-1">Active Orders on Map</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeOrders.map((order) => {
                  const driver   = drivers.find((d) => d.id === order.driverId);
                  const isActive = selectedOrderId === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(isActive ? null : order.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-all cursor-pointer",
                        isActive
                          ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md"
                          : "bg-white border-blue-100 hover:border-blue-300 hover:shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        isActive ? "bg-blue-500" : "bg-blue-100"
                      )}>
                        <MapPin className={cn("w-4 h-4", isActive ? "text-white" : "text-blue-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-400">#{order.id}</p>
                          {isActive && (
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Tracking</span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-900">{order.patientName}</p>
                        {order.deliveryAddress && <p className="text-xs text-slate-500 truncate">{order.deliveryAddress}</p>}
                        {driver && <p className="text-xs text-blue-600 font-semibold mt-0.5">Driver: {driver.name} · {driver.vehiclePlate}</p>}
                        {!isActive && <p className="text-[11px] text-slate-400 mt-1">Tap to track route on map</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Active Deliveries ───────────────────── */}
      {tab === "active" && (
        <>
          {activeOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
              <Truck className="w-16 h-16 text-slate-200 mb-3" />
              <p className="text-slate-600 font-semibold">No active deliveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => {
                const driver = drivers.find((d) => d.id === order.driverId);
                return (
                  <div key={order.id} className="bg-white rounded-3xl border border-blue-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">#{order.id}</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{order.patientName}</p>
                        <p className="text-xs text-slate-500">{order.patientPhone}</p>
                      </div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                        In Transit
                      </span>
                    </div>

                    {order.deliveryAddress && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-farumasi-600 shrink-0" />
                        {order.deliveryAddress}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-sm font-extrabold text-farumasi-700">
                        {formatPrice(order.totalAmount)} RWF
                      </p>
                      {driver && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-farumasi-100 flex items-center justify-center text-farumasi-700 text-[10px] font-bold">
                            {driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <p className="text-xs font-semibold text-slate-600">{driver.name}</p>
                          <span className="text-xs text-slate-400">· {driver.vehiclePlate}</span>
                        </div>
                      )}
                      {!driver && order.driverName && (
                        <p className="text-xs font-semibold text-slate-600">🚚 {order.driverName}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Drivers ─────────────────────────────── */}
      {tab === "drivers" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-farumasi-100 flex items-center justify-center font-extrabold text-farumasi-700 text-lg">
                  {driver.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full capitalize", STATUS_COLORS[driver.status])}>
                  {driver.status.replace(/_/g, " ")}
                </span>
              </div>

              <p className="text-base font-extrabold text-slate-900">{driver.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {driver.phone}
              </p>

              <div className="mt-3 bg-slate-50 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Vehicle</p>
                  <p className="text-xs font-semibold text-slate-700 capitalize">{driver.vehicleType}</p>
                  <p className="text-[10px] text-slate-400">{driver.vehiclePlate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Deliveries</p>
                  <p className="text-sm font-bold text-farumasi-700">{driver.totalDeliveries}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-900">{driver.rating}</span>
                </div>

                {driver.status !== "on_delivery" && (
                  <button
                    onClick={() => cycleStatus(driver.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors",
                      driver.status === "available"
                        ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "border-farumasi-200 text-farumasi-600 hover:bg-farumasi-50"
                    )}
                  >
                    {driver.status === "available" ? (
                      <><ToggleRight className="w-3.5 h-3.5" />Set Off Duty</>
                    ) : (
                      <><ToggleLeft className="w-3.5 h-3.5" />Set Available</>
                    )}
                  </button>
                )}
                {driver.status === "on_delivery" && driver.currentOrderId && (
                  <p className="text-xs text-blue-600 font-semibold">📦 #{driver.currentOrderId}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: History ──────────────────────────────── */}
      {tab === "history" && (
        <>
          {historyOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center">
              <Package className="w-16 h-16 text-slate-200 mb-3" />
              <p className="text-slate-600 font-semibold">No delivery history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">#{order.id}</p>
                      <p className="text-base font-bold text-slate-900">{order.patientName}</p>
                      <p className="text-xs text-slate-500">{order.patientPhone}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full",
                      order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    )}>
                      {order.status === "delivered" ? "Delivered" : "Cancelled"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                    <div>
                      <p className="text-sm font-extrabold text-farumasi-700">{formatPrice(order.totalAmount)} RWF</p>
                      <p className="text-xs text-slate-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    {order.driverName && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">🚚 {order.driverName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


