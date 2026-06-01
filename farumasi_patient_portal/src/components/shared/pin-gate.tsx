"use client";

import { useState, useEffect } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { usePinStore } from "@/store/pin-store";

interface PinGateProps {
  feature: string;
  children: React.ReactNode;
}

/**
 * Wraps protected screens (orders, prescriptions). If the user has set a
 * passcode in Settings and the session is locked, asks for it before
 * revealing the children. No PIN configured → renders children directly.
 */
export function PinGate({ feature, children }: PinGateProps) {
  const pinHash = usePinStore((s) => s.pinHash);
  const isLocked = usePinStore((s) => s.isLocked);
  const isHydrated = usePinStore((s) => s.isHydrated);
  const verifyPin = usePinStore((s) => s.verifyPin);

  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setErr(null); }, [pin]);

  if (!isHydrated) return null;
  if (!pinHash || !isLocked) return <>{children}</>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || busy) return;
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (!ok) {
      setErr("Incorrect passcode");
      setPin("");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-7 text-center">
        <div className="w-14 h-14 rounded-2xl bg-farumasi-50 border border-farumasi-100 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-farumasi-600" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">Enter passcode</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your {feature} is protected. Enter your 4–8 digit passcode to continue.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••"
              className="w-full pl-10 pr-3 h-12 rounded-2xl border border-slate-200 text-center text-lg font-bold tracking-[0.5em] focus:border-farumasi-400 focus:ring-2 focus:ring-farumasi-200 outline-none"
            />
          </div>
          {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
          <button
            type="submit"
            disabled={pin.length < 4 || busy}
            className="w-full h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Unlock"}
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-4">
          Forgot your passcode? You can reset it from Settings → Security.
        </p>
      </div>
    </div>
  );
}
