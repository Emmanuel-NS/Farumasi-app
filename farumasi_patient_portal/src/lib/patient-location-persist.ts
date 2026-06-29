/**
 * Persist patient GPS for delivery fees and future orders.
 * - localStorage: survives refresh when browser permission stays granted
 * - default address: synced to backend for delivery routing
 */

import { patientsService } from "@/lib/services/patients.service";

const LS_KEY = "farumasi_patient_gps_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface PersistedGps {
  lat: number;
  lon: number;
  accuracy: number | null;
  updatedAt: number;
}

export function readPersistedGps(): PersistedGps | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGps;
    if (
      typeof data.lat !== "number" ||
      typeof data.lon !== "number" ||
      typeof data.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - data.updatedAt > MAX_AGE_MS) return null;
    if (data.accuracy != null && data.accuracy > 2_500) return null;
    return data;
  } catch {
    return null;
  }
}

export function writePersistedGps(
  lat: number,
  lon: number,
  accuracy: number | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedGps = {
      lat,
      lon,
      accuracy,
      updatedAt: Date.now(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedGps(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

let lastAddressSyncAt = 0;
const ADDRESS_SYNC_MIN_MS = 60_000;

/** Attach latest GPS to the patient's default saved address (for delivery). */
export async function syncGpsToDefaultAddress(
  lat: number,
  lon: number,
): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastAddressSyncAt < ADDRESS_SYNC_MIN_MS) return;
  lastAddressSyncAt = now;

  try {
    const addresses = await patientsService.listAddresses();
    const target =
      addresses.find((a) => a.is_default) ?? addresses[0];
    if (!target) return;

    const latSame =
      target.latitude != null && Math.abs(target.latitude - lat) < 0.0001;
    const lonSame =
      target.longitude != null && Math.abs(target.longitude - lon) < 0.0001;
    if (latSame && lonSame) return;

    await patientsService.updateAddress(target.id, {
      latitude: lat,
      longitude: lon,
    });
  } catch {
    /* guest or network — localStorage still holds coords for this order */
  }
}
