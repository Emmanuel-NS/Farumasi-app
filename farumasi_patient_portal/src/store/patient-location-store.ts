import { create } from "zustand";
import {
  clearLocationWatch,
  DEFAULT_KIGALI_COORDS,
  requestFreshPatientLocation,
  watchPatientLocation,
  type Coords,
} from "@/lib/location";

export type PatientLocationSource = "gps" | "address" | "fallback" | null;
export type PatientLocationStatus =
  | "idle"
  | "pending"
  | "granted"
  | "denied"
  | "unsupported";

/** Ignore GPS fixes worse than this (metres) unless we have nothing better. */
const MAX_ACCEPTABLE_ACCURACY_M = 2_500;

function shouldAcceptGpsFix(
  accuracy: number | null,
  prevAccuracy: number | null,
): boolean {
  if (accuracy == null) return true;
  if (accuracy <= MAX_ACCEPTABLE_ACCURACY_M) return true;
  if (prevAccuracy == null) return true;
  return accuracy <= prevAccuracy;
}

interface PatientLocationStore {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  updatedAt: number | null;
  source: PatientLocationSource;
  status: PatientLocationStatus;
  watchId: number | null;
  setPosition: (
    coords: Coords,
    source: PatientLocationSource,
    accuracy?: number | null,
  ) => void;
  setStatus: (status: PatientLocationStatus) => void;
  /** Force a fresh GPS read (no browser cache). */
  refresh: () => Promise<boolean>;
  /** Start continuous GPS updates; returns cleanup. */
  startLiveWatch: () => () => void;
  stopLiveWatch: () => void;
}

export const usePatientLocationStore = create<PatientLocationStore>((set, get) => ({
  lat: null,
  lon: null,
  accuracy: null,
  updatedAt: null,
  source: null,
  status: "idle",
  watchId: null,

  setPosition: (coords, source, accuracy = null) => {
    if (source === "gps" && !shouldAcceptGpsFix(accuracy, get().accuracy)) {
      return;
    }
    set({
      lat: coords.lat,
      lon: coords.lon,
      accuracy,
      source,
      updatedAt: Date.now(),
      status: source === "gps" ? "granted" : get().status,
    });
  },

  setStatus: (status) => set({ status }),

  refresh: async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unsupported" });
      return false;
    }
    set({ status: "pending" });
    try {
      const { coords, accuracy } = await requestFreshPatientLocation();
      if (!shouldAcceptGpsFix(accuracy, get().accuracy)) {
        set({ status: get().lat != null ? "granted" : "idle" });
        return get().lat != null;
      }
      set({
        lat: coords.lat,
        lon: coords.lon,
        accuracy,
        source: "gps",
        updatedAt: Date.now(),
        status: "granted",
      });
      return true;
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      set({ status: code === 1 ? "denied" : get().status === "granted" ? "granted" : "idle" });
      return false;
    }
  },

  stopLiveWatch: () => {
    const { watchId } = get();
    if (watchId != null && typeof navigator !== "undefined") {
      clearLocationWatch(watchId);
    }
    set({ watchId: null });
  },

  startLiveWatch: () => {
    const state = get();
    if (state.watchId != null) {
      return () => get().stopLiveWatch();
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unsupported" });
      return () => {};
    }

    void state.refresh();

    const watchId = watchPatientLocation(
      (coords, accuracy) => {
        get().setPosition(coords, "gps", accuracy);
      },
      (err) => {
        if (err.code === 1) set({ status: "denied" });
      },
    );

    if (watchId != null) set({ watchId });

    return () => get().stopLiveWatch();
  },
}));

export function patientCoordsTuple(): [number, number] | null {
  const { lat, lon } = usePatientLocationStore.getState();
  return lat != null && lon != null ? [lat, lon] : null;
}

export function getPatientCoords(): { coords: Coords; isFallback: boolean } {
  const { lat, lon, source } = usePatientLocationStore.getState();
  if (lat != null && lon != null) {
    return {
      coords: { lat, lon },
      isFallback: source !== "gps",
    };
  }
  return { coords: DEFAULT_KIGALI_COORDS, isFallback: true };
}

export function isLocationApproximate(): boolean {
  const { accuracy, source } = usePatientLocationStore.getState();
  return source === "gps" && accuracy != null && accuracy > 500;
}
