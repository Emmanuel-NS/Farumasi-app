"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/lib/store/auth";
import { useLayoutDataStore } from "@/lib/store/layout-data";

const ALLOWED_ROLES = new Set(["partner_company_admin", "super_admin"]);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  // Guard against Zustand not having hydrated from localStorage yet (SSR / Fast Refresh).
  // We defer auth checks until after client-side mount so the persisted token is available.
  const [hydrated, setHydrated] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const startPolling = useLayoutDataStore((s) => s.startPolling);

  // Mark as hydrated after first client-side render (localStorage is available by then).
  useEffect(() => {
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

  // Single poller for all layout-level live data (60s interval keeps API quiet)
  useEffect(() => {
    if (!ready) return;
    const stop = startPolling(60_000);
    return stop;
  }, [ready, startPolling]);

  if (!ready) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
        {/* Topbar skeleton */}
        <div className="h-14 flex items-center px-4 gap-4 bg-farumasi-600">
          <div className="w-7 h-7 rounded bg-white/20" />
          <div className="h-5 w-28 rounded bg-white/20" />
          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/20" />
            <div className="w-7 h-7 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar skeleton */}
          <div className="w-56 bg-farumasi-700/40 shrink-0 p-3 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/10" />
            ))}
          </div>
          {/* Content skeleton */}
          <main className="flex-1 overflow-hidden p-6 bg-slate-50 rounded-tl-2xl">
            <div className="space-y-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-5 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-56 rounded bg-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-7 w-20 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border p-5 h-52 space-y-3">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-40 rounded-lg bg-slate-100" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
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
