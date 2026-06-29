import { create } from "zustand";
import {
  clearLocationWatch,
  DEFAULT_KIGALI_COORDS,
  requestFreshPatientLocation,
  watchPatientLocation,
  type Coords,
} from "@/lib/location";
import {
  queryGeolocationPermission,
  requestLocationPermission,
  type PermissionBlockReason,
} from "@/lib/permissions";
import {
  readPersistedGps,
  syncGpsToDefaultAddress,
  writePersistedGps,
} from "@/lib/patient-location-persist";

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
  permissionBlockReason: PermissionBlockReason | null;
  watchId: number | null;
  setPosition: (
    coords: Coords,
    source: PatientLocationSource,
    accuracy?: number | null,
  ) => void;
  setStatus: (status: PatientLocationStatus) => void;
  /** Fresh GPS read. Pass userInitiated:true from a button tap so the browser may show the prompt. */
  refresh: (options?: { userInitiated?: boolean }) => Promise<boolean>;
  /** Live GPS updates — only starts when permission is already granted (no auto-prompt). */
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
  permissionBlockReason: null,
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
      permissionBlockReason: source === "gps" ? null : get().permissionBlockReason,
    });
    if (source === "gps") {
      writePersistedGps(coords.lat, coords.lon, accuracy);
      void syncGpsToDefaultAddress(coords.lat, coords.lon);
    }
  },

  setStatus: (status) => set({ status }),

  refresh: async (options) => {
    const userInitiated = options?.userInitiated === true;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unsupported", permissionBlockReason: "unsupported" });
      return false;
    }

    const perm = await queryGeolocationPermission();
    if (perm === "denied") {
      set({ status: "denied", permissionBlockReason: "denied" });
      return false;
    }

    // Never trigger the browser prompt without an explicit user tap.
    if (!userInitiated && perm !== "granted") {
      return get().lat != null;
    }

    set({ status: "pending", permissionBlockReason: null });

    if (userInitiated && perm !== "granted") {
      const result = await requestLocationPermission();
      if (result.state !== "granted") {
        set({
          status: result.state === "denied" ? "denied" : "idle",
          permissionBlockReason: result.blockReason ?? null,
        });
        return false;
      }
    }

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
        permissionBlockReason: null,
      });
      writePersistedGps(coords.lat, coords.lon, accuracy);
      void syncGpsToDefaultAddress(coords.lat, coords.lon);
      return true;
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      set({
        status: code === 1 ? "denied" : get().status === "granted" ? "granted" : "idle",
        permissionBlockReason:
          code === 1 ? "denied" : code === 3 ? "timeout" : code === 2 ? "unavailable" : "prompt_blocked",
      });
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

    void (async () => {
      const perm = await queryGeolocationPermission();
      if (perm === "denied") {
        set({ status: "denied", permissionBlockReason: "denied" });
        return;
      }
      if (perm !== "granted") {
        // Wait for user to tap Enable — do not auto-prompt on mount.
        return;
      }

      await get().refresh();

      const watchId = watchPatientLocation(
        (coords, accuracy) => {
          get().setPosition(coords, "gps", accuracy);
        },
        (err) => {
          if (err.code === 1) {
            set({ status: "denied", permissionBlockReason: "denied" });
          }
        },
      );

      if (watchId != null) set({ watchId });
    })();

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

/** Restore last known GPS from localStorage (no permission prompt). */
export function hydratePatientLocationFromStorage(): void {
  const persisted = readPersistedGps();
  if (!persisted) return;
  const state = usePatientLocationStore.getState();
  if (state.source === "gps" && state.lat != null) return;
  state.setPosition(
    { lat: persisted.lat, lon: persisted.lon },
    "gps",
    persisted.accuracy,
  );
}
