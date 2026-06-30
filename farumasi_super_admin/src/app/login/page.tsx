"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { authService, getApiError } from "@/lib/services/auth.service";
import { TOKEN_KEY } from "@/lib/api";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "finance_admin",
  "operations_admin",
  "compliance_admin",
]);

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [pendingToken, setPendingToken] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFaMessage, setTwoFaMessage] = useState("");

  async function finishLogin(accessToken: string, refreshToken: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, accessToken);
    }
    const me = await authService.getMe();
    if (!ALLOWED_ROLES.has(me.role)) {
      localStorage.removeItem(TOKEN_KEY);
      setError("Access denied. Admin portal credentials required.");
      return;
    }
    setSession(
      { access_token: accessToken, refresh_token: refreshToken },
      {
        id: me.id,
        email: me.email,
        full_name: me.full_name,
        role: me.role,
      },
    );
    router.replace("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.requires_2fa) {
        if (!result.pending_token) {
          setError("Two-factor verification could not be started.");
          return;
        }
        setPendingToken(result.pending_token);
        setTwoFaMessage(result.message ?? "Enter the verification code sent to your email.");
        setStep("2fa");
        setOtp("");
        return;
      }
      if (!result.access_token || !result.refresh_token) {
        setError("Sign-in failed. Please try again.");
        return;
      }
      await finishLogin(result.access_token, result.refresh_token);
    } catch (err: unknown) {
      setError(getApiError(err, "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authService.verifyTwoFactorLogin(pendingToken, otp);
      if (!result.access_token || !result.refresh_token) {
        setError("Verification failed. Please try again.");
        return;
      }
      await finishLogin(result.access_token, result.refresh_token);
    } catch (err: unknown) {
      setError(getApiError(err, "Invalid or expired verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend2fa() {
    setError("");
    setLoading(true);
    try {
      const res = await authService.resendTwoFactorLogin(pendingToken);
      setTwoFaMessage(res.message ?? "Verification code resent.");
    } catch (err: unknown) {
      setError(getApiError(err, "Could not resend code."));
    } finally {
      setLoading(false);
    }
  }

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
          {step === "credentials" ? (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your admin credentials to continue</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="admin@farumasi.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Admin@12345"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-farumasi-600 font-medium hover:underline">
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Verify it&apos;s you</h2>
              <p className="text-sm text-slate-500 mb-6">{twoFaMessage}</p>

              <form onSubmit={handleVerify2fa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full py-3 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Verifying…" : "Complete sign in"}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setOtp("");
                      setError("");
                    }}
                    className="text-slate-500 hover:text-slate-700 font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend2fa}
                    disabled={loading}
                    className="text-farumasi-600 font-semibold hover:underline disabled:opacity-60"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}

          {process.env.NODE_ENV === "development" && step === "credentials" && (
            <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
              Dev seed: <span className="font-mono">admin@farumasi.com</span> /{" "}
              <span className="font-mono">Admin@12345</span>
            </p>
          )}
        </div>

        <p className="text-center text-farumasi-100 text-xs mt-6">
          Authorised personnel only · FARUMASI © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
