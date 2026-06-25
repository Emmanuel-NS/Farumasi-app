"use client";

import { useCallback } from "react";
import {
  usePatientLocationStore,
  type PatientLocationStatus,
} from "@/store/patient-location-store";

export function usePatientLocation() {
  const lat = usePatientLocationStore((s) => s.lat);
  const lon = usePatientLocationStore((s) => s.lon);
  const accuracy = usePatientLocationStore((s) => s.accuracy);
  const updatedAt = usePatientLocationStore((s) => s.updatedAt);
  const source = usePatientLocationStore((s) => s.source);
  const status = usePatientLocationStore((s) => s.status);
  const refresh = usePatientLocationStore((s) => s.refresh);

  const coordsTuple: [number, number] | null =
    lat != null && lon != null ? [lat, lon] : null;

  const requestLocation = useCallback(() => {
    void refresh();
  }, [refresh]);

  return {
    lat,
    lon,
    coordsTuple,
    accuracy,
    updatedAt,
    source,
    status,
    hasGps: source === "gps" && coordsTuple !== null,
    refresh,
    requestLocation,
  };
}

export type { PatientLocationStatus };
