"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Kigali, Rwanda — realistic delivery route
const WAYPOINTS: [number, number][] = [
  [-1.9530, 30.0592], // Origin: pharmacy (Nyarugenge)
  [-1.9495, 30.0605],
  [-1.9471, 30.0638],
  [-1.9448, 30.0690],
  [-1.9420, 30.0741], // Destination: customer
];

const ORIGIN      = WAYPOINTS[0];
const DESTINATION = WAYPOINTS[WAYPOINTS.length - 1];

// Build driver SVG icon
function makeDriverIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:white;border:2.5px solid #1e9e68;
        box-shadow:0 2px 8px rgba(30,158,104,0.4);
        display:flex;align-items:center;justify-content:center;
        position:relative;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="14" height="18" rx="3" fill="#1e9e68"/>
          <rect x="7" y="5" width="10" height="6" rx="1.5" fill="white" opacity="0.7"/>
          <circle cx="7.5"  cy="19" r="2" fill="#0d4f30"/>
          <circle cx="16.5" cy="19" r="2" fill="#0d4f30"/>
          <circle cx="7.5"  cy="3"  r="1.5" fill="#0d4f30"/>
          <circle cx="16.5" cy="3"  r="1.5" fill="#0d4f30"/>
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9h6V3H3v6zm2-4h2v2H5V5zM15 3v6h6V3h-6zm4 4h-2V5h2v2zM3 21h6v-6H3v6zm2-4h2v2H5v-2zM15 21h6v-6h-6v6zm2-4h2v2h-2v-2z" opacity=".5"/><circle cx="12" cy="12" r="3" fill="white"/></svg>
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

// Pans map to keep driver visible
function FollowDriver({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(pos, { animate: true, duration: 1.5 });
  }, [map, pos]);
  return null;
}

interface Props {
  pharmacyName: string;
  eta: number;
}

export default function TrackingMap({ pharmacyName, eta }: Props) {
  const [driverPos, setDriverPos] = useState<[number, number]>(WAYPOINTS[0]);
  const [stepIndex, setStepIndex] = useState(0);
  const [t, setT] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate driver along waypoints with smooth interpolation
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setT((prev) => {
        const next = prev + 0.02; // ~50 ticks per segment = 5s per segment
        if (next >= 1) {
          setStepIndex((s) => {
            if (s < WAYPOINTS.length - 2) return s + 1;
            return s; // stay at destination
          });
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Compute interpolated position
  useEffect(() => {
    if (stepIndex >= WAYPOINTS.length - 1) {
      setDriverPos(DESTINATION);
      return;
    }
    const from = WAYPOINTS[stepIndex];
    const to   = WAYPOINTS[stepIndex + 1];
    // ease-in-out
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    setDriverPos([
      from[0] + (to[0] - from[0]) * ease,
      from[1] + (to[1] - from[1]) * ease,
    ]);
  }, [stepIndex, t]);

  return (
    <MapContainer
      center={[-1.9475, 30.0665]}
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

      {/* Route polyline */}
      <Polyline
        positions={WAYPOINTS}
        pathOptions={{ color: "#1e9e68", weight: 4, dashArray: "8,5", lineCap: "round" }}
      />

      {/* Origin marker */}
      <Marker position={ORIGIN} icon={makeOriginIcon()}>
      </Marker>

      {/* Destination marker */}
      <Marker position={DESTINATION} icon={makeDestIcon()}>
      </Marker>

      {/* Driver marker */}
      <Marker position={driverPos} icon={makeDriverIcon()}>
      </Marker>

      {/* Keep driver centered */}
      <FollowDriver pos={driverPos} />
    </MapContainer>
  );
}
