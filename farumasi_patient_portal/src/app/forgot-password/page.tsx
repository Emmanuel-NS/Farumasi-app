"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { authService } from "@/lib/services/auth.service";
import { toast } from "sonner";

const INPUT_CLS =
  "w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 focus:bg-white transition-all";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setSuccessMessage(res.message);
      setSent(true);
      toast.success(res.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Could not send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-farumasi-600 rounded-xl flex items-center justify-center">
            <FarumasiLogo size={20} onDark />
          </div>
          <span className="font-extrabold text-farumasi-700 tracking-wide">FARUMASI</span>
        </div>

        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-farumasi-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <h1 className="text-2xl font-extrabold text-slate-900">Forgot password?</h1>
        <p className="text-slate-500 text-sm mt-1 mb-7">
          Enter your email and we&apos;ll send a 6-digit verification code by email or SMS.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm text-emerald-800">{successMessage}</p>
            <Link
              href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
              className="inline-flex text-sm font-semibold text-farumasi-600 hover:underline"
            >
              Enter verification code
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email address"
                autoComplete="email"
                className={INPUT_CLS}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-55 text-white font-bold text-sm transition-colors"
            >
              {loading ? "Sending…" : "Send reset code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
