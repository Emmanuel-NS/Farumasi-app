"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PortalLoadingShell } from "@/components/layout/portal-loading-shell";
import { useAuthStore } from "@/lib/store/auth";
import { useLayoutDataStore } from "@/lib/store/layout-data";

const ALLOWED_ROLES = new Set(["partner_company_admin", "pharmacy_admin", "pharmacist"]);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  // Guard against Zustand not having hydrated from localStorage yet (SSR / Fast Refresh).
  // We defer auth checks until after client-side mount so the persisted token is available.
  const [hydrated, setHydrated] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const startPolling = useLayoutDataStore((s) => s.startPolling);

  useEffect(() => {
    setMounted(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (user && !ALLOWED_ROLES.has(user.role)) {
      logout();
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [hydrated, token, user, router, logout]);

  // Single poller — 2 min, pauses when tab is hidden (saves CPU/RAM)
  useEffect(() => {
    if (!ready) return;
    return startPolling(120_000);
  }, [ready, startPolling]);

  useEffect(() => {
    if (!ready || !token) return;
    if (typeof document !== "undefined") {
      document.cookie = "farumasi_partner_auth=1; path=/; max-age=604800; SameSite=Lax";
    }
  }, [ready, token]);

  if (!mounted || !ready) {
    return <PortalLoadingShell />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <Topbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 overflow-y-auto scrollbar-hide p-6 bg-slate-50 rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
