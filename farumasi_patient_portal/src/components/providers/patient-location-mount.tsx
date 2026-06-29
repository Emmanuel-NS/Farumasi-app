"use client";

import { useEffect } from "react";
import {
  hydratePatientLocationFromStorage,
  usePatientLocationStore,
} from "@/store/patient-location-store";
import { patientsService } from "@/lib/services/patients.service";
import { useAuthStore } from "@/store/auth-store";
import { queryGeolocationPermission } from "@/lib/permissions";

/**
 * Restores saved GPS when available; live updates only after permission was granted
 * at delivery checkout (never prompts on app load).
 */
export function PatientLocationMount() {
  const isGuest = useAuthStore((s) => s.isGuest);

  useEffect(() => {
    hydratePatientLocationFromStorage();

    let stopWatch = () => {};

    void (async () => {
      const perm = await queryGeolocationPermission();
      if (perm === "granted") {
        stopWatch = usePatientLocationStore.getState().startLiveWatch();
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        const perm = await queryGeolocationPermission();
        if (perm === "granted") {
          await usePatientLocationStore.getState().refresh();
        }
      })();
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
