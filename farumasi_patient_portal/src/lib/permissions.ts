/** Browser permission helpers for the patient portal (web / installed PWA). */

import {
  FALLBACK_GEO_OPTIONS,
  FRESH_GEO_OPTIONS,
  readGeolocationPosition,
  type GeoPosition,
} from "@/lib/location";

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export type PermissionBlockReason =
  | "denied"
  | "prompt_blocked"
  | "unsupported"
  | "timeout"
  | "unavailable";

export interface PermissionRequestResult {
  state: PermissionState;
  blockReason?: PermissionBlockReason;
  /** Position from the same user-gesture GPS call — reuse so we don't ask twice. */
  position?: GeoPosition;
}

export function notificationPermissionState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionRequestResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { state: "unsupported", blockReason: "unsupported" };
  }
  if (Notification.permission === "granted") return { state: "granted" };
  if (Notification.permission === "denied") {
    return { state: "denied", blockReason: "denied" };
  }
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") return { state: "granted" };
    if (result === "denied") return { state: "denied", blockReason: "denied" };
    // Still "default" — prompt may not have appeared (overlay / blocked).
    return { state: "default", blockReason: "prompt_blocked" };
  } catch {
    return { state: "denied", blockReason: "prompt_blocked" };
  }
}

export async function queryGeolocationPermission(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "default";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state as PermissionState;
  } catch {
    return "default";
  }
}

function geolocationErrorToResult(err: unknown): PermissionRequestResult {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) return { state: "denied", blockReason: "denied" };
  if (code === 3) return { state: "default", blockReason: "timeout" };
  if (code === 2) return { state: "default", blockReason: "unavailable" };
  return { state: "default", blockReason: "prompt_blocked" };
}

function toGeoPosition(pos: GeolocationPosition): GeoPosition {
  return {
    coords: readGeolocationPosition(pos),
    accuracy: pos.coords.accuracy ?? null,
  };
}

function getCurrentPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Request location — must be called from a user tap/click.
 * Returns the GPS fix from this same call so callers do not need a second attempt.
 */
export async function requestLocationPermission(): Promise<PermissionRequestResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { state: "unsupported", blockReason: "unsupported" };
  }

  const queried = await queryGeolocationPermission();
  if (queried === "denied") {
    return { state: "denied", blockReason: "denied" };
  }

  try {
    const pos = await getCurrentPositionOnce(FRESH_GEO_OPTIONS);
    return { state: "granted", position: toGeoPosition(pos) };
  } catch (err: unknown) {
    const code = (err as GeolocationPositionError)?.code;
    if (code === 1) return geolocationErrorToResult(err);
    // Timeout / unavailable: one soft retry without making the user tap again
    try {
      const pos = await getCurrentPositionOnce(FALLBACK_GEO_OPTIONS);
      return { state: "granted", position: toGeoPosition(pos) };
    } catch (err2: unknown) {
      return geolocationErrorToResult(err2);
    }
  }
}

/** Short platform hint for opening site settings when permission is blocked. */
export function siteSettingsHint(kind: "location" | "notification"): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (kind === "location") {
    if (isIos) return "Settings → Safari → Location → Allow for this site.";
    if (isAndroid) return "Chrome ⋮ → Settings → Site settings → Location → Allow.";
    return "Browser address bar → site icon → Permissions → Location → Allow.";
  }

  if (isIos) return "Settings → Notifications → Safari (or FARUMASI app) → Allow.";
  if (isAndroid) return "Chrome ⋮ → Settings → Site settings → Notifications → Allow.";
  return "Browser address bar → site icon → Permissions → Notifications → Allow.";
}

export type PermissionHelpKey =
  | "perm_prompt_blocked"
  | "perm_denied_location"
  | "perm_denied_notification"
  | "perm_overlay_steps";

/** English fallbacks — UI should prefer translation keys when available. */
export function permissionHelpFallback(key: PermissionHelpKey): string {
  switch (key) {
    case "perm_prompt_blocked":
      return (
        "Your browser couldn't show the permission prompt. Close any chat bubbles, " +
        "floating overlays, or picture-in-picture from other apps, then tap Enable again."
      );
    case "perm_overlay_steps":
      return "Close Messenger/WhatsApp bubbles, stop screen recording, then try again from a direct tap — not while a popup is open.";
    case "perm_denied_location":
      return "Location is blocked for this site. Allow it in your browser or device settings, then return here.";
    case "perm_denied_notification":
      return "Notifications are blocked for this site. Allow them in your browser or device settings.";
  }
}

export function permissionResultMessage(
  kind: "location" | "notification",
  result: PermissionRequestResult,
  t?: Partial<Record<PermissionHelpKey, string>>,
): string {
  const msg = (key: PermissionHelpKey) => t?.[key] ?? permissionHelpFallback(key);

  if (result.state === "granted") return "";

  if (result.blockReason === "denied" || result.state === "denied") {
    return kind === "location" ? msg("perm_denied_location") : msg("perm_denied_notification");
  }
  if (result.blockReason === "prompt_blocked") {
    return `${msg("perm_prompt_blocked")} ${msg("perm_overlay_steps")}`;
  }
  if (result.blockReason === "timeout") {
    return "Location timed out. Move to an open area with signal, close overlays, and try again.";
  }
  if (result.blockReason === "unavailable") {
    return "Location unavailable on this device. Try the mobile app or choose pickup.";
  }
  return msg("perm_prompt_blocked");
}

const DISMISS_KEY = "farumasi_perm_banner_dismissed";

export function wasPermissionBannerDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPermissionBanner(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISMISS_KEY, "1");
}

/** Clear dismiss so the banner can show again after login / account switch. */
export function clearPermissionBannerDismiss(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DISMISS_KEY);
}
