"use client";

import { useState } from "react";
import { mockDrivers } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Truck, Phone, Star, ToggleLeft, ToggleRight } from "lucide-react";
import type { DriverStatus } from "@/types";

const STATUS_COLORS: Record<DriverStatus, string> = {
  available: "bg-green-100 text-green-700",
  on_delivery: "bg-blue-100 text-blue-700",
  off_duty: "bg-slate-100 text-slate-500",
};

export default function FleetPage() {
  const [drivers, setDrivers] = useState(mockDrivers);

  const cycleStatus = (id: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next: DriverStatus =
          d.status === "available" ? "off_duty" :
          d.status === "off_duty" ? "available" : d.status;
        return { ...d, status: next };
      })
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">{drivers.filter((d) => d.status !== "off_duty").length} driver{drivers.filter((d) => d.status !== "off_duty").length !== 1 ? "s" : ""} active</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
            {/* Avatar */}
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
    </div>
  );
}
