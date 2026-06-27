"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const FALLBACK_WAYPOINTS: [number, number][] = [
  [-1.9530, 30.0592],
  [-1.9495, 30.0605],
  [-1.9471, 30.0638],
  [-1.9448, 30.0690],
  [-1.9420, 30.0741],
];

function makeDriverIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:white;border:2.5px solid #1e9e68;
        box-shadow:0 2px 8px rgba(30,158,104,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="14" height="18" rx="3" fill="#1e9e68"/>
          <rect x="7" y="5" width="10" height="6" rx="1.5" fill="white" opacity="0.7"/>
          <circle cx="7.5"  cy="19" r="2" fill="#0d4f30"/>
          <circle cx="16.5" cy="19" r="2" fill="#0d4f30"/>
        </svg>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function makeOriginIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:30px;height:30px;border-radius:50%;
        background:#f97316;border:3px solid white;
        box-shadow:0 2px 6px rgba(249,115,22,0.5);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="3" fill="white"/></svg>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function makeDestIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:40px;height:48px;">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
          <path d="M20 2C11.16 2 4 9.16 4 18c0 11.5 16 28 16 28s16-16.5 16-28c0-8.84-7.16-16-16-16z" fill="#1e9e68" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="6" fill="white"/>
        </svg>
      </div>`,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
  });
}

function FollowDriver({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(pos, { animate: true, duration: 1.5 });
  }, [map, pos]);
  return null;
}

function interpolate(
  from: [number, number],
  to: [number, number],
  t: number,
): [number, number] {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

interface Props {
  pharmacyName: string;
  eta?: number | null;
  pickup?: [number, number] | null;
  destination?: [number, number] | null;
  progress?: number;
}

export default function TrackingMap({
  pickup,
  destination,
  progress = 0.2,
}: Props) {
  const hasLiveRoute = Boolean(pickup && destination);
  const origin = pickup ?? FALLBACK_WAYPOINTS[0];
  const dest = destination ?? FALLBACK_WAYPOINTS[FALLBACK_WAYPOINTS.length - 1];
  const route = useMemo<[number, number][]>(() => {
    if (hasLiveRoute) return [origin, dest];
    return FALLBACK_WAYPOINTS;
  }, [hasLiveRoute, origin, dest]);

  const staticDriver = useMemo(
    () => interpolate(origin, dest, Math.min(Math.max(progress, 0.05), 0.95)),
    [origin, dest, progress],
  );

  const [driverPos, setDriverPos] = useState<[number, number]>(staticDriver);
  const [stepIndex, setStepIndex] = useState(0);
  const [t, setT] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasLiveRoute) {
      setDriverPos(staticDriver);
      return;
    }
    const tick = () => {
      setT((prev) => {
        const next = prev + 0.02;
        if (next >= 1) {
          setStepIndex((s) => (s < route.length - 2 ? s + 1 : s));
          return 0;
        }
        return next;
      });
    };
    const start = () => {
      if (tickRef.current) return;
      tickRef.current = setInterval(tick, 250);
    };
    const stop = () => {
      if (!tickRef.current) return;
      clearInterval(tickRef.current);
      tickRef.current = null;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    if (typeof document !== "undefined" && document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [hasLiveRoute, route.length, staticDriver]);

  useEffect(() => {
    if (hasLiveRoute) {
      setDriverPos(staticDriver);
      return;
    }
    if (stepIndex >= route.length - 1) {
      setDriverPos(dest);
      return;
    }
    const from = route[stepIndex];
    const to = route[stepIndex + 1];
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    setDriverPos([
      from[0] + (to[0] - from[0]) * ease,
      from[1] + (to[1] - from[1]) * ease,
    ]);
  }, [hasLiveRoute, stepIndex, t, route, dest, staticDriver]);

  const center = useMemo<[number, number]>(() => {
    if (hasLiveRoute) return interpolate(origin, dest, 0.5);
    return [-1.9475, 30.0665];
  }, [hasLiveRoute, origin, dest]);

  return (
    <div className="relative">
      {!hasLiveRoute && (
        <p className="absolute top-2 left-2 right-2 z-[1000] text-[10px] font-medium text-amber-800 bg-amber-50/95 border border-amber-200 rounded-lg px-2 py-1 text-center">
          Estimated route — live rider GPS appears when delivery is in progress.
        </p>
      )}
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: "280px", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <Polyline
          positions={route}
          pathOptions={{ color: "#1e9e68", weight: 4, dashArray: "8,5", lineCap: "round" }}
        />

        <Marker position={origin} icon={makeOriginIcon()} />
        <Marker position={dest} icon={makeDestIcon()} />
        <Marker position={driverPos} icon={makeDriverIcon()} />
        <FollowDriver pos={driverPos} />
      </MapContainer>
    </div>
  );
}
