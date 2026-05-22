"use client";

/* Dynamically imported (no SSR) — safe to use browser-only Leaflet APIs */
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Order, Driver } from "@/types";

/* ─── Fix Leaflet default icon paths for Next.js ─── */
(function fixIcons() {
  if (typeof window === "undefined") return;
  const base = "https://unpkg.com/leaflet@1.9.4/dist/images/";
  L.Icon.Default.mergeOptions({
    iconUrl:       base + "marker-icon.png",
    iconRetinaUrl: base + "marker-icon-2x.png",
    shadowUrl:     base + "marker-shadow.png",
  });
})();

/* ─── Icon helpers ─── */
function circleIcon(color: string, size = 16, pulse = false) {
  const ring = pulse
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:3px solid ${color};opacity:.4;animation:ping 1.2s ease-out infinite"></div><style>@keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}</style>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px">${ring}<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

const pharmacyIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#1E9E68;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span style="color:white;font-size:11px;font-weight:900;line-height:1">Rx</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -18],
});

/* ─── GPS coordinates (Kigali area mock data) ─── */
const PHARMACY: [number, number] = [-1.9441, 30.0619];

const ORDER_COORDS: Record<string, { dest: [number, number]; driver: [number, number] }> = {
  "ORD-7829X": {
    dest:   [-1.9520, 30.0750],
    driver: [-1.9480, 30.0685],
  },
};

/* ─── OSRM route fetching (free, no API key) ─── */
async function fetchRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM unavailable");
  const data = await res.json();
  return (data.routes[0].geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]);
}
function fallback(a: [number, number], b: [number, number]): [number, number][] { return [a, b]; }

/* ─── Map controller: fly to selected order bounds ─── */
function OrderFocus({ orderId }: { orderId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!orderId) return;
    const c = ORDER_COORDS[orderId];
    if (!c) return;
    map.flyToBounds(
      L.latLngBounds([PHARMACY, c.driver, c.dest].map(([lat, lng]) => L.latLng(lat, lng))),
      { padding: [60, 60], duration: 1.0 }
    );
  }, [map, orderId]);
  return null;
}

/* ─── Map controller: initial fit-all (runs once) ─── */
function FitAll({ positions }: { positions: [number, number][] }) {
  const map  = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || positions.length < 2) return;
    done.current = true;
    map.fitBounds(L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng))), { padding: [40, 40] });
  }, [map, positions]);
  return null;
}

/* ─── Route polylines for the selected order ─── */
function RouteLayers({ orderId, orders, drivers }: { orderId: string; orders: Order[]; drivers: Driver[] }) {
  const [completed, setCompleted] = useState<[number, number][]>([]);
  const [remaining, setRemaining] = useState<[number, number][]>([]);

  useEffect(() => {
    const c = ORDER_COORDS[orderId];
    if (!c) return;
    setCompleted([]);
    setRemaining([]);
    Promise.all([
      fetchRoute(PHARMACY, c.driver).catch(() => fallback(PHARMACY, c.driver)),
      fetchRoute(c.driver, c.dest).catch(() => fallback(c.driver, c.dest)),
    ]).then(([done, pending]) => { setCompleted(done); setRemaining(pending); });
  }, [orderId]);

  const order  = orders.find((o) => o.id === orderId);
  const coords = ORDER_COORDS[orderId];
  const driver = drivers.find((d) => d.id === order?.driverId);

  return (
    <>
      {/* Completed leg — solid teal */}
      {completed.length > 1 && (
        <Polyline positions={completed} pathOptions={{ color: "#0EA5E9", weight: 5, opacity: 0.9 }} />
      )}
      {/* Remaining leg — dashed orange */}
      {remaining.length > 1 && (
        <Polyline positions={remaining} pathOptions={{ color: "#F97316", weight: 4, opacity: 0.9, dashArray: "10 8" }} />
      )}
      {/* Enlarged driver marker (pulsing) */}
      {coords && (
        <Marker position={coords.driver} icon={circleIcon("#F97316", 22, true)}>
          <Popup>
            <strong>{driver?.name ?? order?.driverName ?? "Driver"}</strong><br />
            <span style={{ fontSize: 12, color: "#F97316" }}>En route → {order?.patientName}</span><br />
            {driver && <span style={{ fontSize: 12, color: "#555" }}>{driver.vehicleType} · {driver.vehiclePlate}</span>}
          </Popup>
        </Marker>
      )}
      {/* Enlarged destination marker */}
      {coords && (
        <Marker position={coords.dest} icon={circleIcon("#3B82F6", 22)}>
          <Popup>
            <strong>{orderId}</strong> — Destination<br />
            <span style={{ fontSize: 12 }}>Patient: {order?.patientName}</span><br />
            {order?.deliveryAddress && <span style={{ fontSize: 12, color: "#666" }}>{order.deliveryAddress}</span>}
          </Popup>
        </Marker>
      )}
    </>
  );
}

/* ─── Main component ─── */
export interface DeliveryMapProps {
  orders: Order[];
  drivers: Driver[];
  selectedOrderId?: string | null;
}

export default function DeliveryMap({ orders, drivers, selectedOrderId = null }: DeliveryMapProps) {
  const activeOrders    = orders.filter((o) => o.status === "out_for_delivery");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const allPositions: [number, number][] = [PHARMACY];
  activeOrders.forEach((o) => {
    const c = ORDER_COORDS[o.id];
    if (c) allPositions.push(c.dest, c.driver);
  });

  return (
    <MapContainer center={PHARMACY} zoom={13} style={{ width: "100%", height: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAll positions={allPositions} />
      <OrderFocus orderId={selectedOrderId} />

      {/* Pharmacy origin */}
      <Marker position={PHARMACY} icon={pharmacyIcon}>
        <Popup>
          <strong>Farumasi Pharmacy</strong><br />
          <span style={{ fontSize: 12, color: "#555" }}>Origin / Dispatch point</span>
        </Popup>
      </Marker>

      {/* Active delivery default markers — dim/hide when a specific order is selected */}
      {activeOrders.map((order) => {
        const c      = ORDER_COORDS[order.id];
        const driver = drivers.find((d) => d.id === order.driverId);
        /* Selected order uses enlarged markers from RouteLayers */
        if (!c || selectedOrderId === order.id) return null;
        const dim = !!selectedOrderId;
        return (
          <span key={order.id}>
            <Marker position={c.dest} icon={circleIcon(dim ? "#93C5FD" : "#3B82F6", 14)}>
              <Popup>
                <strong>{order.id}</strong><br />
                <span style={{ fontSize: 12 }}>Patient: {order.patientName}</span><br />
                {order.deliveryAddress && <span style={{ fontSize: 12, color: "#666" }}>{order.deliveryAddress}</span>}
                {driver && <><br /><span style={{ fontSize: 12, color: "#1E9E68" }}>Driver: {driver.name}</span></>}
              </Popup>
            </Marker>
            <Marker position={c.driver} icon={circleIcon(dim ? "#FCA5A5" : "#FB923C", 14)}>
              <Popup>
                <strong>{driver?.name ?? order.driverName ?? "Driver"}</strong><br />
                <span style={{ fontSize: 12 }}>En route → {order.patientName}</span><br />
                {driver && <><br /><span style={{ fontSize: 12, color: "#555" }}>{driver.vehicleType} · {driver.vehiclePlate}</span></>}
              </Popup>
            </Marker>
          </span>
        );
      })}

      {/* Delivered markers */}
      {deliveredOrders.map((order) => {
        const c = ORDER_COORDS[order.id];
        if (!c) return null;
        return (
          <Marker key={order.id} position={c.dest} icon={circleIcon(selectedOrderId ? "#86EFAC" : "#22C55E", 12)}>
            <Popup>
              <strong>{order.id}</strong> — Delivered<br />
              <span style={{ fontSize: 12 }}>Patient: {order.patientName}</span>
            </Popup>
          </Marker>
        );
      })}

      {/* Route overlay for the focused order */}
      {selectedOrderId && (
        <RouteLayers key={selectedOrderId} orderId={selectedOrderId} orders={orders} drivers={drivers} />
      )}
    </MapContainer>
  );
}

