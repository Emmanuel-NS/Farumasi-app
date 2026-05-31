"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "@/lib/toast";
import api, { getApiError } from "@/lib/api";

const ALLOWED_ROLES = new Set(["pharmacy_admin", "partner_company_admin", "pharmacist"]);

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const tokens = await authService.login(email.trim(), password);
      // Temporarily persist token so authService.getMe() can use it
      if (typeof window !== "undefined") {
        localStorage.setItem("farumasi_partner_token", tokens.access_token);
      }
      const me = await authService.getMe();
      if (!ALLOWED_ROLES.has(me.role)) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("farumasi_partner_token");
        }
        toast.error(
          me.role === "pharmacist"
            ? "Farumasi internal pharmacists should use the Pharmacist Portal."
            : "This account is not a partner account."
        );
        return;
      }
      // For pharmacist role: require a pharmacy affiliation (partner pharmacy staff only)
      if (me.role === "pharmacist") {
        const { data: profile } = await api.get<{ pharmacy_id?: string | null }>("/pharmacists/me");
        if (!profile.pharmacy_id) {
          if (typeof window !== "undefined") localStorage.removeItem("farumasi_partner_token");
          toast.error("Your account is for the Farumasi Pharmacist Portal, not the Partner Portal.");
          return;
        }
      }
      setSession(tokens, me);
      toast.success(`Welcome back, ${me.full_name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Sign-in failed. Check your email and password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="FARUMASI" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-white font-bold tracking-wide">FARUMASI</p>
            <p className="text-sidebar-text text-xs">Partner Portal</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your pharmacy,<br />
            <span className="text-farumasi-400">amplified.</span>
          </h1>
          <p className="text-sidebar-text text-sm leading-relaxed max-w-sm">
            Manage your listings, track orders, monitor inventory, and grow your revenue — all from one powerful dashboard.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {["10+ Modules", "Real-time Analytics", "Rwanda-first"].map(f => (
              <div key={f} className="rounded-xl bg-sidebar-hover border border-sidebar-border p-3 text-center">
                <p className="text-white text-xs font-semibold">{f}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-text text-xs">© 2026 Farumasi Ltd. Kigali, Rwanda.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
            </div>
            <span className="font-bold text-foreground">FARUMASI Partner Portal</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your partner account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="you@pharmacy.rw"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-border" />
                Remember me
              </label>
              <a href="#" className="text-xs text-farumasi-600 hover:underline">Forgot password?</a>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Signing in…" : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-farumasi-600 font-medium hover:underline">Apply as partner</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
