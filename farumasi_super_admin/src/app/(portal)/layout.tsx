"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { PortalShell } from "@/components/layout/PortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
        <div className="h-14 flex items-center px-4 gap-4 bg-farumasi-600">
          <div className="w-7 h-7 rounded bg-white/20" />
          <div className="h-5 w-32 rounded bg-white/20" />
          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/20" />
            <div className="w-8 h-8 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-60 bg-farumasi-700/40 shrink-0 p-3 space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-white/10" />
            ))}
          </div>
          <main className="flex-1 overflow-hidden p-6 bg-slate-50 rounded-tl-2xl">
            <div className="space-y-6 animate-pulse max-w-[1600px] mx-auto">
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
              <div className="bg-white rounded-xl border p-5 h-52">
                <div className="h-full rounded-lg bg-slate-100" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  return <PortalShell>{children}</PortalShell>;
}
