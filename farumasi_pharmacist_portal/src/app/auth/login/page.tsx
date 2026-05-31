"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logout = useAuthStore((s) => s.logout);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      await login(email, password);
      // Only Farumasi internal pharmacists (and super_admin) may access this portal
      const user = useAuthStore.getState().user;
      if (user && user.role !== "pharmacist" && user.role !== "super_admin") {
        logout();
        setError(
          user.role === "pharmacy_admin" || user.role === "partner_company_admin"
            ? "This portal is for Farumasi pharmacists only. Partner pharmacies should use the Partner Portal."
            : "You don't have access to this portal."
        );
        return;
      }
      router.push("/overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-farumasi-700 via-farumasi-600 to-farumasi-500 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/20 backdrop-blur mb-3">
            <span className="text-3xl">💊</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">FARUMASI</h1>
          <p className="text-white/70 text-sm mt-1 font-medium">Pharmacist Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to manage your pharmacy</p>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@example.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-xs text-farumasi-600 font-medium hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in…</>
              ) : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Patient? Visit{" "}
            <a href="http://localhost:3002" className="text-farumasi-600 font-medium hover:underline">
              Patient Portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
