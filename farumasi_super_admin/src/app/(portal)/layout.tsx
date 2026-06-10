"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/services/auth.service";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalLoadingShell } from "@/components/layout/portal-loading-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function verify() {
      if (!token) {
        router.replace("/login");
        return;
      }

      if (user?.role === "super_admin" && !cancelled) {
        setReady(true);
      }

      try {
        let current = user;
        if (!current) {
          const me = await authService.getMe();
          if (me.role !== "super_admin") {
            logout();
            router.replace("/login");
            return;
          }
          login(token, {
            id: me.id,
            email: me.email,
            full_name: me.full_name,
            role: me.role,
          });
          current = { id: me.id, email: me.email, full_name: me.full_name, role: me.role };
        } else if (current.role !== "super_admin") {
          logout();
          router.replace("/login");
          return;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!user) {
          logout();
          router.replace("/login");
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, user, router, login, logout]);

  if (!hydrated || !ready) {
    return <PortalLoadingShell />;
  }

  return <PortalShell>{children}</PortalShell>;
}
