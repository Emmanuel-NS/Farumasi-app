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
import {
  DESKTOP_MAX_DELIVERY_ACCURACY_M,
  isDesktopBrowser,
  MOBILE_MAX_DELIVERY_ACCURACY_M,
} from "@/lib/delivery-location";

export type PatientLocationSource = "gps" | "address" | "fallback" | null;
export type PatientLocationStatus =
  | "idle"
  | "pending"
  | "granted"
  | "denied"
  | "unsupported";

function maxStoreAccuracyM(): number {
  return isDesktopBrowser()
    ? DESKTOP_MAX_DELIVERY_ACCURACY_M
    : MOBILE_MAX_DELIVERY_ACCURACY_M;
}

function shouldAcceptGpsFix(
  accuracy: number | null,
  prevAccuracy: number | null,
): boolean {
  const maxAcc = maxStoreAccuracyM();
  if (accuracy == null) return !isDesktopBrowser();
  if (accuracy <= maxAcc) return true;
  // Never store a first fix worse than the platform cap — desktop IP/Wi‑Fi often reports 5–50 km.
  if (prevAccuracy == null) return false;
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

/**
 * After a coarse/rejected first fix, wait briefly for watchPosition to deliver
 * an acceptable reading so the user does not have to tap Enable again.
 */
function waitForAcceptableWatchFix(
  applyFix: (coords: Coords, accuracy: number | null) => boolean,
  set: (partial: Partial<PatientLocationStore>) => void,
  get: () => PatientLocationStore,
  timeoutMs = 8_000,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let watchId: number | null = null;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (watchId != null) clearLocationWatch(watchId);
      if (!ok) {
        const hadGps = get().lat != null && get().source === "gps";
        set({
          status: hadGps ? "granted" : "idle",
          permissionBlockReason: hadGps ? null : "timeout",
        });
      }
      resolve(ok);
    };

    watchId = watchPatientLocation(
      (coords, accuracy) => {
        if (applyFix(coords, accuracy)) finish(true);
      },
      (err) => {
        if (err.code === 1) {
          set({ status: "denied", permissionBlockReason: "denied" });
          finish(false);
        }
      },
    );

    const timer = window.setTimeout(() => {
      finish(get().lat != null && get().source === "gps");
    }, timeoutMs);

    if (watchId == null) {
      finish(false);
    }
  });
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
      return get().lat != null && get().source === "gps";
    }

    set({ status: "pending", permissionBlockReason: null });

    const applyFix = (coords: { lat: number; lon: number }, accuracy: number | null) => {
      if (!shouldAcceptGpsFix(accuracy, get().accuracy)) {
        return get().lat != null && get().source === "gps";
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
    };

    try {
      // User tap path: one GPS call that also unlocks permission — reuse the fix.
      if (userInitiated && perm !== "granted") {
        const result = await requestLocationPermission();
        if (result.state !== "granted") {
          set({
            status: result.state === "denied" ? "denied" : "idle",
            permissionBlockReason: result.blockReason ?? null,
          });
          return false;
        }
        if (result.position) {
          const ok = applyFix(result.position.coords, result.position.accuracy);
          if (ok) return true;
          // Coarse first fix: keep listening briefly for a better one (no extra tap).
          return await waitForAcceptableWatchFix(applyFix, set, get);
        }
      }

      const { coords, accuracy } = await requestFreshPatientLocation();
      const ok = applyFix(coords, accuracy);
      if (ok) return true;
      return await waitForAcceptableWatchFix(applyFix, set, get);
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      // Keep a previously good GPS fix rather than wiping it on a transient timeout.
      const hadGps = get().lat != null && get().source === "gps";
      set({
        status: code === 1 ? "denied" : hadGps ? "granted" : "idle",
        permissionBlockReason:
          code === 1
            ? "denied"
            : code === 3
              ? "timeout"
              : code === 2
                ? "unavailable"
                : "prompt_blocked",
      });
      return hadGps;
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
