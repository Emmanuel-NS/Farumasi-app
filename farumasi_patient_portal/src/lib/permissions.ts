/** Browser permission helpers for the patient portal (web / installed PWA). */

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export function notificationPermissionState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return "denied";
  }
}

export function geolocationPermissionState(): PermissionState {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return typeof navigator !== "undefined" && navigator.geolocation ? "default" : "unsupported";
  }
  return "default";
}

export async function queryGeolocationPermission(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return navigator?.geolocation ? "default" : "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state as PermissionState;
  } catch {
    return navigator.geolocation ? "default" : "unsupported";
  }
}

/** Triggers the browser location prompt (must be called from a user click). */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10_000,
        maximumAge: 60_000,
        enableHighAccuracy: false,
      });
    });
    return "granted";
  } catch (err: unknown) {
    const code = (err as GeolocationPositionError)?.code;
    if (code === 1) return "denied";
    return "default";
  }
}

const DISMISS_KEY = "farumasi_perm_banner_dismissed";

export function wasPermissionBannerDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPermissionBanner(): void {
  sessionStorage.setItem(DISMISS_KEY, "1");
}

export function clearPermissionBannerDismiss(): void {
  sessionStorage.removeItem(DISMISS_KEY);
}
