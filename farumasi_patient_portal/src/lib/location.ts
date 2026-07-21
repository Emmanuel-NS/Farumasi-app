/**
 * Patient geolocation helpers — prefer a fresh GPS fix, with a soft fallback
 * so delivery fee detection does not require multiple user taps.
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
  timeout: 20_000,
};

/** Softer fallback when high-accuracy GPS times out (indoors / slow GPS). */
export const FALLBACK_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 12_000,
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

function readGeoPosition(pos: GeolocationPosition): GeoPosition {
  return {
    coords: readGeolocationPosition(pos),
    accuracy: pos.coords.accuracy ?? null,
  };
}

function getCurrentPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * One-shot GPS read. Tries high-accuracy first; on timeout/unavailable,
 * automatically retries with a softer profile so the user does not need
 * to tap Enable location again.
 */
export async function requestFreshPatientLocation(
  options?: PositionOptions,
): Promise<GeoPosition> {
  try {
    const pos = await getCurrentPositionOnce({ ...FRESH_GEO_OPTIONS, ...options });
    return readGeoPosition(pos);
  } catch (err: unknown) {
    const code = (err as GeolocationPositionError)?.code;
    // PERMISSION_DENIED — do not retry
    if (code === 1) throw err;
    try {
      const pos = await getCurrentPositionOnce(FALLBACK_GEO_OPTIONS);
      return readGeoPosition(pos);
    } catch {
      throw err;
    }
  }
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
    { ...FRESH_GEO_OPTIONS, maximumAge: 5_000, ...options },
  );
}

export function clearLocationWatch(watchId: number): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  navigator.geolocation.clearWatch(watchId);
}
