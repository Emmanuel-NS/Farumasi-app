"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { fetchMarketplaceStats } from "@/lib/services/platform.service";
import { toast } from "sonner";

type Tab = "login" | "register";

const INPUT_CLS =
  "w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 focus:bg-white transition-all";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketStats, setMarketStats] = useState({ productCount: 0, sellerCount: 0 });

  useEffect(() => {
    fetchMarketplaceStats()
      .then(setMarketStats)
      .catch(() => setMarketStats({ productCount: 0, sellerCount: 0 }));
  }, []);

  const featureBullets = [
    marketStats.productCount > 0 && marketStats.sellerCount > 0
      ? `Browse ${marketStats.productCount.toLocaleString()}+ approved products from ${marketStats.sellerCount.toLocaleString()} pharmacies and healthcare partners`
      : "Browse approved medicines and healthcare products from trusted partners",
    "Upload and manage prescriptions",
    "Consult a licensed pharmacist",
    "Health tips and awareness content",
    "Real-time order tracking",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { toast.error("Full name is required"); setLoading(false); return; }
        await register({ full_name: name, email, password, phone: phone || undefined });
      }
      router.push("/store");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : tab === "login" ? "Incorrect email or password" : "Registration failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (brand) — hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-farumasi-600 via-farumasi-700 to-farumasi-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
            <FarumasiLogo size={22} onDark />
          </div>
          <span className="text-white font-extrabold tracking-wide text-lg">FARUMASI</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Healthcare at<br />your fingertips.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            Order medicines, upload prescriptions, and track deliveries — all in one place across Rwanda.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {featureBullets.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-white/80 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} Farumasi Ltd. · Kigali, Rwanda</p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-farumasi-600 rounded-xl flex items-center justify-center">
            <FarumasiLogo size={20} onDark />
          </div>
          <span className="font-extrabold text-farumasi-700 tracking-wide">FARUMASI</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {tab === "login"
                ? "Sign in to your patient account"
                : "Join Farumasi — it's free"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-7">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-white text-farumasi-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Full name"
                    autoComplete="name"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    autoComplete="tel"
                    className={INPUT_CLS}
                  />
                </div>
              </>
            )}

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

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                className={`${INPUT_CLS} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {tab === "login" && (
              <div className="flex items-center justify-end pt-0.5">
                <Link href="/forgot-password" className="text-xs text-farumasi-600 font-semibold hover:underline">Forgot?</Link>
              </div>
            )}

            {/* T&C agreement checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-farumasi-600 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                I have read and agree to the{" "}
                <Link href="/terms" className="text-farumasi-600 font-semibold hover:underline" target="_blank">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-farumasi-600 font-semibold hover:underline" target="_blank">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 active:bg-farumasi-800 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-1 shadow-sm shadow-farumasi-600/30"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <>
                  {tab === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guest browse */}
          <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-slate-400" />
            <Link href="/store" className="text-sm text-slate-500 hover:text-farumasi-600 transition-colors">
              Browse store without an account
            </Link>
          </div>

          <p className="text-center text-[11px] text-slate-300 mt-6">
            <Link href="/terms" className="hover:text-slate-500 transition-colors">Terms of Service</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-slate-500 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
