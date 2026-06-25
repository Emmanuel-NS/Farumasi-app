"use client";

import { useEffect } from "react";
import { usePatientLocationStore } from "@/store/patient-location-store";
import { patientsService } from "@/lib/services/patients.service";
import { useAuthStore } from "@/store/auth-store";

/**
 * Keeps patient GPS fresh for the whole portal session:
 * - watchPosition with maximumAge: 0 (live updates while the tab is open)
 * - fresh read when the tab becomes visible again
 * - saved default address coordinates when GPS is unavailable
 */
export function PatientLocationMount() {
  const isGuest = useAuthStore((s) => s.isGuest);

  useEffect(() => {
    const stopWatch = usePatientLocationStore.getState().startLiveWatch();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void usePatientLocationStore.getState().refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopWatch();
    };
  }, []);

  useEffect(() => {
    if (isGuest) return;
    const { lat, source } = usePatientLocationStore.getState();
    if (lat != null && source === "gps") return;

    patientsService
      .listAddresses()
      .then((addresses) => {
        const def =
          addresses.find((a) => a.is_default && a.latitude != null && a.longitude != null) ??
          addresses.find((a) => a.latitude != null && a.longitude != null);
        if (!def?.latitude || !def?.longitude) return;
        const state = usePatientLocationStore.getState();
        if (state.source === "gps" && state.lat != null) return;
        state.setPosition(
          { lat: def.latitude, lon: def.longitude },
          "address",
          null,
        );
      })
      .catch(() => {});
  }, [isGuest]);

  return null;
}
