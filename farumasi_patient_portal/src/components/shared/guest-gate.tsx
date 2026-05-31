"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Lock } from "lucide-react";

interface GuestGateProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * Wraps a page that requires authentication.
 * If the user is a guest, shows a friendly lock screen.
 * If logged in, renders the page normally.
 */
export function GuestGate({ children, feature = "this feature" }: GuestGateProps) {
  const isGuest = useAuthStore((s) => s.isGuest);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) return null;
  if (!isGuest) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white gap-6 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-farumasi-50 border-2 border-farumasi-200 flex items-center justify-center">
        <Lock className="w-9 h-9 text-farumasi-600" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h2 className="text-xl font-bold text-slate-900">Sign in required</h2>
        <p className="text-sm text-slate-500">
          You need a Farumasi account to access {feature}. It&apos;s free and takes under a minute.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/auth/login"
          className="px-6 py-2.5 bg-farumasi-600 text-white text-sm font-semibold rounded-xl hover:bg-farumasi-700 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/store"
          className="px-6 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Browse Store
        </Link>
      </div>
    </div>
  );
}
