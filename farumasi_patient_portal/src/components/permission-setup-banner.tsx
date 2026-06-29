"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bell, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  dismissPermissionBanner,
  notificationPermissionState,
  permissionHelpFallback,
  permissionResultMessage,
  requestNotificationPermission,
  siteSettingsHint,
  wasPermissionBannerDismissed,
  type PermissionState,
} from "@/lib/permissions";

/**
 * Notifications only — location is requested at delivery checkout when fees are calculated.
 */
export function PermissionSetupBanner() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const [visible, setVisible] = useState(false);
  const [notif, setNotif] = useState<PermissionState>("default");
  const [busy, setBusy] = useState(false);
  const [helpText, setHelpText] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrating || isGuest) {
      setVisible(false);
      return;
    }
    if (wasPermissionBannerDismissed()) return;

    const n = notificationPermissionState();
    setNotif(n);
    if (n !== "granted" && n !== "unsupported") {
      setVisible(true);
    }
  }, [isGuest, isHydrating]);

  useEffect(() => {
    if (!visible) return;
    if (notif === "granted" || notif === "unsupported") {
      setVisible(false);
    }
  }, [visible, notif]);

  if (!visible) return null;
  if (notif === "granted" || notif === "unsupported") return null;

  const close = () => {
    dismissPermissionBanner();
    setVisible(false);
  };

  const enableNotifications = async () => {
    setBusy(true);
    setHelpText(null);
    const result = await requestNotificationPermission();
    setNotif(result.state);
    setBusy(false);
    if (result.state === "granted") {
      close();
      return;
    }
    setHelpText(permissionResultMessage("notification", result));
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
            <p className="font-semibold text-slate-900 text-sm">Stay updated on your orders</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Allow notifications for pharmacist messages and delivery updates. Location is only asked when you choose delivery at checkout.
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
          <button
            type="button"
            disabled={busy || notif === "denied"}
            onClick={() => void enableNotifications()}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            <Bell className="w-4 h-4 text-farumasi-600 shrink-0" />
            <span className="flex-1 text-sm text-slate-800">
              {notif === "denied"
                ? `Notifications blocked — ${siteSettingsHint("notification")}`
                : busy
                  ? "Requesting…"
                  : "Enable notifications"}
            </span>
          </button>

          {helpText && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
              {helpText}
            </p>
          )}

          {!helpText && (
            <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">
              {permissionHelpFallback("perm_overlay_steps")}
            </p>
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
