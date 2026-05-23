/**
 * Patient geolocation helper.
 *
 * Phase 11.2 scope: the patient session does not yet carry coordinates. The
 * backend recommendation endpoint requires lat/lon, so until the patient's
 * default address (`/patients/me/addresses`) is wired into the session we
 * fall back to a public Kigali city-center coordinate. This is documented
 * fallback behavior, NOT a silent hardcode inside a component.
 *
 * TODO(Phase 12): resolve from patient default_address_id or live geolocation,
 *                 then drop the fallback.
 */
export interface Coords {
  lat: number;
  lon: number;
}

export const DEFAULT_KIGALI_COORDS: Coords = {
  lat: -1.9536,
  lon: 30.0606,
};

/**
 * Returns the best-effort coordinates for the current patient.
 * Currently always returns the Kigali fallback. Callers should surface a
 * subtle hint to the user that recommendations are approximate.
 */
export function getPatientCoords(): { coords: Coords; isFallback: boolean } {
  return { coords: DEFAULT_KIGALI_COORDS, isFallback: true };
}
