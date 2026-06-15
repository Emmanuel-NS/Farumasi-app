"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { authService } from "@/lib/services/auth.service";
import type { AuthUser } from "@/types";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-error";

interface CompleteProfileDialogProps {
  user: AuthUser;
  open: boolean;
  onComplete: (user: AuthUser) => void;
}

export function CompleteProfileDialog({ user, open, onComplete }: CompleteProfileDialogProps) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const firstName = user.name.split(" ")[0] || "there";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("Enter a valid Rwanda phone number (e.g. 0781234567)");
      return;
    }
    setLoading(true);
    try {
      const updated = await authService.updateMe({ phone: digits });
      toast.success("Profile updated");
      onComplete(updated);
    } catch (err) {
      toast.error(getApiError(err, "Could not save phone number"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 animate-in fade-in slide-in-from-bottom-4"
        role="dialog"
        aria-labelledby="complete-profile-title"
      >
        <h2 id="complete-profile-title" className="text-xl font-extrabold text-slate-900">
          Complete your profile
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Hi {firstName}, add your phone number so pharmacies and riders can reach you about orders.
        </p>
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0781234567"
              autoComplete="tel"
              required
              className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
