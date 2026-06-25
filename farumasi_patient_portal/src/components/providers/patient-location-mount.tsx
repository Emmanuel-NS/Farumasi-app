"use client";

import { useEffect } from "react";
import { usePatientLocationStore } from "@/store/patient-location-store";

/**
 * Keeps patient GPS fresh for the whole portal session:
 * - watchPosition with maximumAge: 0 (live updates while the tab is open)
 * - fresh read when the tab becomes visible again
 */
export function PatientLocationMount() {
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

  return null;
}
