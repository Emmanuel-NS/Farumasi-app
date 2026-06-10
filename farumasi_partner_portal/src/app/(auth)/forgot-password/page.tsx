"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setSent(true);
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not send reset code. Try again."));
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
          We&apos;ll email you a verification code so you can choose a new password.
        </p>
        <p className="text-sidebar-text text-xs">© 2026 Farumasi Ltd. Kigali, Rwanda.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-farumasi-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Forgot password?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your partner account email to receive a reset code.
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-sm text-emerald-800">
                If an account exists for that email, a verification code has been sent.
              </p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                className="text-sm font-medium text-farumasi-600 hover:underline"
              >
                Enter verification code
              </Link>
            </div>
          ) : (
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
