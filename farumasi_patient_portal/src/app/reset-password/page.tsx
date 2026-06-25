"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { authService } from "@/lib/services/auth.service";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-error";

const INPUT_CLS =
  "auth-input w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 focus:bg-white transition-all";

const RESET_EMAIL_KEY = "farumasi_reset_email";
const RESET_CODE_KEY = "farumasi_reset_code";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"code" | "password">("code");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(RESET_EMAIL_KEY);
    const savedCode = sessionStorage.getItem(RESET_CODE_KEY);
    if (savedEmail) setEmail(savedEmail);
    if (savedCode) {
      setCode(savedCode);
      setStep("password");
    }
  }, []);

  const handleCodeStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit verification code");
      return;
    }
    sessionStorage.setItem(RESET_EMAIL_KEY, email.trim());
    sessionStorage.setItem(RESET_CODE_KEY, code.trim());
    setStep("password");
  };

  const handlePasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(email, code, password);
      sessionStorage.removeItem(RESET_EMAIL_KEY);
      sessionStorage.removeItem(RESET_CODE_KEY);
      toast.success(res.message);
      router.push("/auth/login");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not reset password. Check your code and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white auth-page">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-farumasi-600 rounded-xl flex items-center justify-center">
            <FarumasiLogo size={20} onDark />
          </div>
          <span className="font-extrabold text-farumasi-700 tracking-wide">FARUMASI</span>
        </div>

        <Link
          href={step === "password" ? "#" : "/forgot-password"}
          onClick={(e) => {
            if (step === "password") {
              e.preventDefault();
              setStep("code");
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-farumasi-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === "password" ? "Back to code" : "Request a new code"}
        </Link>

        <h1 className="text-2xl font-extrabold text-slate-900">
          {step === "code" ? "Enter reset code" : "Choose new password"}
        </h1>
        <p className="text-slate-500 text-sm mt-1 mb-7">
          {step === "code"
            ? "We sent a 6-digit code to your email. Enter it below to continue."
            : "Create a strong password for your account."}
        </p>

        {step === "code" ? (
          <form onSubmit={handleCodeStep} className="space-y-4">
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

            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              placeholder="6-digit code"
              autoComplete="one-time-code"
              className="w-full h-14 rounded-2xl border-2 border-farumasi-200 bg-farumasi-50 px-4 text-2xl text-farumasi-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all tracking-[0.35em] text-center font-mono font-bold"
            />

            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const digits = text.replace(/\D/g, "").slice(0, 6);
                  if (digits.length === 6) setCode(digits);
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
              type="submit"
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordStep} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="New password"
                autoComplete="new-password"
                className={`${INPUT_CLS} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className={INPUT_CLS}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-55 text-white font-bold text-sm transition-colors"
            >
              {loading ? "Updating…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500 auth-page">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
