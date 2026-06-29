/**
 * Delivery eligibility from patient coordinates.
 * Desktop browsers often use IP/Wi‑Fi geolocation that can be wrong by many km.
 */

import type { PatientLocationSource } from "@/store/patient-location-store";

/** Matches farumasi_api/app/utils/distance.py */
export const KIGALI_BOUNDS = {
  latMin: -2.05,
  latMax: -1.85,
  lonMin: 29.95,
  lonMax: 30.15,
} as const;

/** Desktop: require a tight fix — IP geolocation is often 5–50 km off. */
export const DESKTOP_MAX_DELIVERY_ACCURACY_M = 800;

/** Mobile: allow typical phone GPS (still capped in the location store). */
export const MOBILE_MAX_DELIVERY_ACCURACY_M = 2_500;

export type DeliveryLocationBlockReason =
  | "no_gps"
  | "outside_kigali"
  | "low_accuracy"
  | "desktop_unreliable";

export type DeliveryLocationAssessment =
  | { ok: true }
  | { ok: false; reason: DeliveryLocationBlockReason };

export function isInsideKigali(lat: number, lon: number): boolean {
  return (
    lat >= KIGALI_BOUNDS.latMin &&
    lat <= KIGALI_BOUNDS.latMax &&
    lon >= KIGALI_BOUNDS.lonMin &&
    lon <= KIGALI_BOUNDS.lonMax
  );
}

export function isDesktopBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent,
  );
}

export function maxDeliveryAccuracyM(): number {
  return isDesktopBrowser()
    ? DESKTOP_MAX_DELIVERY_ACCURACY_M
    : MOBILE_MAX_DELIVERY_ACCURACY_M;
}

export function assessDeliveryLocation(
  lat: number | null,
  lon: number | null,
  accuracy: number | null,
  source: PatientLocationSource,
): DeliveryLocationAssessment {
  if (lat == null || lon == null || source !== "gps") {
    return { ok: false, reason: "no_gps" };
  }

  if (!isInsideKigali(lat, lon)) {
    return { ok: false, reason: "outside_kigali" };
  }

  const maxAcc = maxDeliveryAccuracyM();
  const desktop = isDesktopBrowser();

  if (accuracy != null && accuracy > maxAcc) {
    return { ok: false, reason: desktop ? "desktop_unreliable" : "low_accuracy" };
  }

  // Many desktop browsers omit accuracy or report a coarse fix without flagging it.
  if (desktop && (accuracy == null || accuracy > 500)) {
    return { ok: false, reason: "desktop_unreliable" };
  }

  return { ok: true };
}
