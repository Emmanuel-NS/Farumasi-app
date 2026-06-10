"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Shield } from "lucide-react";
import { authService, getApiError } from "@/lib/services/auth.service";

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
      setError(getApiError(err, "Could not send reset code. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-farumasi-700 via-farumasi-600 to-farumasi-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FARUMASI</h1>
          <p className="text-farumasi-100 text-sm mt-1">Super Admin Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-farumasi-600 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Forgot password?</h2>
          <p className="text-sm text-slate-500 mb-6">
            Enter your admin email to receive a 6-digit verification code.
          </p>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
              {error}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="admin@farumasi.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 transition disabled:opacity-60"
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
