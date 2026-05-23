"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { ShieldAlert } from "lucide-react";

/**
 * Patient-portal role guard.
 *
 * Rules:
 *  - Anonymous users: pass through (store browsing etc. is allowed).
 *  - Logged-in patient: pass through.
 *  - Logged-in non-patient (pharmacist, rider, doctor, admin, ...): block with
 *    a friendly "wrong portal" full-screen message and a sign-out button.
 *
 * This wrapper is applied at the (patient)/layout level so individual pages
 * do not need changes. Pages that additionally require authentication still
 * use <GuestGate> for the sign-in prompt.
 */
export function PatientRoleGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);

  if (isGuest || !user || user.role === "patient") {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
        <ShieldAlert className="w-9 h-9 text-amber-600" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-xl font-bold text-slate-900">Wrong portal</h2>
        <p className="text-sm text-slate-500">
          Your account role is <span className="font-semibold text-slate-700">{user.role}</span>.
          The Patient Portal is reserved for patient accounts. Please sign in with a patient
          account or open the correct portal for your role.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => {
            logout();
            window.location.href = "/auth/login";
          }}
          className="px-6 py-2.5 bg-farumasi-600 text-white text-sm font-semibold rounded-xl hover:bg-farumasi-700 transition-colors"
        >
          Sign out
        </button>
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
