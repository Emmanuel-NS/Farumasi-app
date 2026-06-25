"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { CompleteProfileDialog } from "@/components/auth/complete-profile-dialog";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { fetchMarketplaceStats } from "@/lib/services/platform.service";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-error";
import type { AuthUser } from "@/types";

type Tab = "login" | "register";

const INPUT_CLS =
  "auth-input w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 focus:bg-white transition-all";

const PENDING_REG_KEY = "farumasi_pending_registration_email";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, verifyRegistration, resendRegistrationOtp, signInWithGoogle, setUser } =
    useAuthStore();
  const isGuest = useAuthStore((s) => s.isGuest);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [marketStats, setMarketStats] = useState({ productCount: 0, sellerCount: 0 });
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchMarketplaceStats()
      .then(setMarketStats)
      .catch(() => setMarketStats({ productCount: 0, sellerCount: 0 }));
    const saved = sessionStorage.getItem(PENDING_REG_KEY);
    if (saved) {
      setPendingEmail(saved);
      setTab("register");
    }
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!isHydrating && !isGuest && !pendingEmail) {
      router.replace("/store");
    }
  }, [isHydrating, isGuest, pendingEmail, router]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !useAuthStore.getState().isGuest) {
        router.replace("/store");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

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
      if (pendingEmail) {
        await verifyRegistration(pendingEmail, otp);
        sessionStorage.removeItem(PENDING_REG_KEY);
        router.replace("/store");
        return;
      }
      if (tab === "login") {
        await login(email, password);
        router.replace("/store");
      } else {
        if (!name.trim()) { toast.error("Full name is required"); setLoading(false); return; }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        const pending = await register({ full_name: name, email, password, phone: phone || undefined });
        setPendingEmail(pending.email);
        sessionStorage.setItem(PENDING_REG_KEY, pending.email);
        toast.success("Verification code sent — check your email or phone.");
      }
    } catch (err: unknown) {
      const fallback =
        tab === "login"
          ? "Incorrect email/phone or password"
          : "Registration failed. Check your email and try again.";
      toast.error(getApiError(err, fallback));
    } finally {
      setLoading(false);
    }
  };

  const needsPhone = (user: AuthUser) => {
    const digits = (user.phone ?? "").replace(/\D/g, "");
    return digits.length < 9;
  };

  const finishAuth = useCallback(
    (user: AuthUser) => {
      if (needsPhone(user)) {
        setProfileUser(user);
        return;
      }
      router.replace("/store");
    },
    [router],
  );

  const handleGoogleSignIn = useCallback(
    async (params: { email: string; full_name: string; google_id: string }) => {
      if (!agreedToTerms) {
        toast.error("Please accept the Terms of Service and Privacy Policy first.");
        return;
      }
      setLoading(true);
      try {
        const user = await signInWithGoogle(params);
        finishAuth(user);
      } catch (err: unknown) {
        toast.error(getApiError(err, "Google sign-in failed"));
      } finally {
        setLoading(false);
      }
    },
    [agreedToTerms, signInWithGoogle, finishAuth],
  );

  return (
    <div className="min-h-screen flex auth-page">
      {profileUser && (
        <CompleteProfileDialog
          user={profileUser}
          open
          onComplete={(updated) => {
            setUser(updated);
            setProfileUser(null);
            router.replace("/store");
          }}
        />
      )}
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white auth-form-panel">
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
              {pendingEmail ? "Verify your account" : tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {pendingEmail
                ? "Enter the code we sent to your email or phone"
                : tab === "login"
                ? "Sign in with email or phone number"
                : "Join Farumasi — it's free"}
            </p>
          </div>

          {/* Tab switcher — hidden during OTP step */}
          {!pendingEmail && (
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
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {pendingEmail ? (
              <>
                <p className="text-sm text-slate-600 text-center">
                  Code sent to <span className="font-semibold text-slate-800">{pendingEmail}</span>
                </p>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="auth-input w-full h-14 rounded-2xl border-2 border-farumasi-200 bg-farumasi-50 px-4 text-2xl text-farumasi-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all tracking-[0.35em] text-center font-mono font-bold dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/\D/g, "").slice(0, 6);
                      if (digits.length === 6) setOtp(digits);
                      else toast.error("Clipboard does not contain a 6-digit code");
                    } catch {
                      toast.error("Paste the code from your email manually");
                    }
                  }}
                  className="w-full text-sm text-farumasi-600 font-semibold hover:underline"
                >
                  Paste code from clipboard
                </button>
                <button
                  type="button"
                  onClick={() => void resendRegistrationOtp(pendingEmail).then(() => toast.success("Code resent"))}
                  className="text-sm text-farumasi-600 font-semibold hover:underline"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(PENDING_REG_KEY);
                    setPendingEmail(null);
                    setOtp("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Use a different email
                </button>
              </>
            ) : (
            <>
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
                type={tab === "login" ? "text" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={tab === "login" ? "Email or phone number" : "Email address"}
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
                minLength={8}
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

            {tab === "register" && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={INPUT_CLS}
                />
              </div>
            )}
            </>
            )}

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
                  {pendingEmail ? "Verify account" : tab === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!pendingEmail && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="flex justify-center [&>div]:w-full [&_iframe]:!w-full">
                <GoogleSignInButton
                  disabled={loading || !agreedToTerms}
                  onSuccess={handleGoogleSignIn}
                />
              </div>
              {!agreedToTerms && (
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  Accept the terms above to use Google sign-in
                </p>
              )}
            </>
          )}

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
