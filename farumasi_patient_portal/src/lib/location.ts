/**
 * Patient geolocation helpers — always prefer a fresh GPS fix (maximumAge: 0).
 */

export interface Coords {
  lat: number;
  lon: number;
}

export const DEFAULT_KIGALI_COORDS: Coords = {
  lat: -1.9536,
  lon: 30.0606,
};

/** Browser options for an up-to-date position (no stale cache). */
export const FRESH_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

export function readGeolocationPosition(pos: GeolocationPosition): Coords {
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
  };
}

/**
 * Returns the best coordinates available in the client session.
 * Re-exported from the location store (live GPS when available).
 */
export { getPatientCoords } from "@/store/patient-location-store";

export interface GeoPosition {
  coords: Coords;
  accuracy: number | null;
}

/** One-shot fresh GPS read (includes accuracy in metres when available). */
export function requestFreshPatientLocation(
  options?: PositionOptions,
): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: readGeolocationPosition(pos),
          accuracy: pos.coords.accuracy ?? null,
        }),
      (err) => reject(err),
      { ...FRESH_GEO_OPTIONS, ...options },
    );
  });
}

/** @deprecated Use requestFreshPatientLocation */
export function requestPatientLocation(
  options?: PositionOptions,
): Promise<Coords> {
  return requestFreshPatientLocation(options).then((r) => r.coords);
}

/** Continuous GPS updates; returns watch id or null. */
export function watchPatientLocation(
  onUpdate: (coords: Coords, accuracy: number | null) => void,
  onError?: (err: GeolocationPositionError) => void,
  options?: PositionOptions,
): number | null {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate(readGeolocationPosition(pos), pos.coords.accuracy ?? null),
    onError,
    { ...FRESH_GEO_OPTIONS, ...options },
  );
}

export function clearLocationWatch(watchId: number): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  navigator.geolocation.clearWatch(watchId);
}
