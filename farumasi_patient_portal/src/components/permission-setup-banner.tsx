"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bell, MapPin, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  dismissPermissionBanner,
  notificationPermissionState,
  queryGeolocationPermission,
  requestLocationPermission,
  requestNotificationPermission,
  wasPermissionBannerDismissed,
  type PermissionState,
} from "@/lib/permissions";

/**
 * One-time banner after sign-in so notifications/location are not left on "denied by default".
 * Browsers block auto-prompts without a user gesture — this gives a clear Enable action.
 */
export function PermissionSetupBanner() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const [visible, setVisible] = useState(false);
  const [notif, setNotif] = useState<PermissionState>("default");
  const [geo, setGeo] = useState<PermissionState>("default");
  const [busy, setBusy] = useState<"notif" | "geo" | null>(null);

  useEffect(() => {
    if (isHydrating || isGuest) {
      setVisible(false);
      return;
    }
    if (wasPermissionBannerDismissed()) return;

    const n = notificationPermissionState();
    const check = async () => {
      const g = await queryGeolocationPermission();
      setNotif(n);
      setGeo(g);
      if (n !== "granted" || g === "denied" || g === "default") {
        setVisible(true);
      }
    };
    void check();
  }, [isGuest, isHydrating]);

  useEffect(() => {
    if (!visible) return;
    const needsNotif = notif !== "granted" && notif !== "unsupported";
    const needsGeo = geo !== "granted" && geo !== "unsupported";
    if (!needsNotif && !needsGeo) {
      setVisible(false);
    }
  }, [visible, notif, geo]);

  if (!visible) return null;

  const needsNotif = notif !== "granted" && notif !== "unsupported";
  const needsGeo = geo !== "granted" && geo !== "unsupported";

  if (!needsNotif && !needsGeo) return null;

  const close = () => {
    dismissPermissionBanner();
    setVisible(false);
  };

  const enableNotifications = async () => {
    setBusy("notif");
    const result = await requestNotificationPermission();
    setNotif(result);
    setBusy(null);
    if (result === "granted" && !needsGeo) close();
  };

  const enableLocation = async () => {
    setBusy("geo");
    const result = await requestLocationPermission();
    setGeo(result);
    setBusy(null);
    if (result === "granted" && !needsNotif) close();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] sm:left-auto sm:right-6 sm:max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden">
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-farumasi-50 to-white">
          <Image
            src="/logo-icon.png"
            alt="FARUMASI"
            width={44}
            height={44}
            className="rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">Allow FARUMASI on this device</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Enable notifications and location so you get pharmacist messages, order updates, and accurate delivery fees.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {needsNotif && (
            <button
              type="button"
              disabled={busy !== null || notif === "denied"}
              onClick={() => void enableNotifications()}
              className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <Bell className="w-4 h-4 text-farumasi-600 shrink-0" />
              <span className="flex-1 text-sm text-slate-800">
                {notif === "denied"
                  ? "Notifications blocked — open browser / Windows app settings to allow"
                  : busy === "notif"
                    ? "Requesting…"
                    : "Enable notifications"}
              </span>
            </button>
          )}
          {needsGeo && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void enableLocation()}
              className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <MapPin className="w-4 h-4 text-farumasi-600 shrink-0" />
              <span className="flex-1 text-sm text-slate-800">
                {geo === "denied"
                  ? "Location blocked — allow in browser or Windows privacy settings"
                  : busy === "geo"
                    ? "Requesting…"
                    : "Enable location for delivery"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="w-full text-xs text-slate-500 hover:text-slate-700 py-1"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
