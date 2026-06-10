"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? "Could not send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-farumasi-700 via-farumasi-600 to-farumasi-500 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white mb-3 shadow-sm">
            <Image src="/logo.png" alt="FARUMASI" width={36} height={36} className="object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">FARUMASI</h1>
          <p className="text-white/70 text-sm mt-1 font-medium">Pharmacist Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-7">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-farumasi-600 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Forgot password?</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter your email and we&apos;ll send a 6-digit verification code.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {sent ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
              <p className="text-sm text-emerald-800">
                If an account exists for that email, a verification code has been sent.
              </p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                className="text-sm font-semibold text-farumasi-600 hover:underline"
              >
                Enter verification code
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="pharmacist@example.com"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-colors"
              >
                {loading ? "Sending…" : "Send reset code"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
