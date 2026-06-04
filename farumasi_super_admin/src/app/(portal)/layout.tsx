"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalLoadingShell } from "@/components/layout/portal-loading-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

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
    if (user && user.role !== "super_admin") {
      logout();
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [hydrated, token, user, router, logout]);

  if (!mounted || !ready) {
    return <PortalLoadingShell />;
  }

  return <PortalShell>{children}</PortalShell>;
}
