"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";
import { authService } from "@/lib/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await authService.login(email, password);
      localStorage.setItem("farumasi_rider_token", tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem("farumasi_rider_refresh", tokens.refresh_token);
      }
      const me = await authService.getMe();
      if (me.role !== "rider") {
        localStorage.removeItem("farumasi_rider_token");
        localStorage.removeItem("farumasi_rider_refresh");
        toast.error("Access denied. Rider accounts only.");
        return;
      }
      localStorage.setItem("farumasi_rider_user", JSON.stringify(me));
      router.push("/deliveries");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid credentials";
      toast.error(typeof msg === "string" ? msg : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8F7] p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-farumasi-600 text-white mb-1">
            <Bike className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">FARUMASI Rider</h1>
          <p className="text-sm text-slate-500">Sign in to manage deliveries</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500"
              placeholder="rider@farumasi.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
