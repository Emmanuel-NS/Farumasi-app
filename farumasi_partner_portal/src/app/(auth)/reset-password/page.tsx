"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(email, code, password);
      toast.success(res.message);
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not reset password. Check your code and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
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
        <p className="text-sidebar-text text-sm max-w-sm">
          Enter the code from your email and set a new password for your partner account.
        </p>
        <p className="text-sidebar-text text-xs">© 2026 Farumasi Ltd. Kigali, Rwanda.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-farumasi-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Request a new code
          </Link>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Reset password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use the verification code sent to your email.
            </p>
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
              <Label>Verification code</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="tracking-widest text-center font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Repeat new password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Reset password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
