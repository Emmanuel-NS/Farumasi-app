"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { PAYOUT_METHODS, payoutMethodLabel, selectedPayoutMethod, type PayoutMethodValue } from "@/lib/payout-methods";
import {
  payoutCredentialsService,
  type PayoutCredentials,
} from "@/lib/services/payout-credentials.service";

interface Props {
  onUpdated?: (profile: PayoutCredentials) => void;
}

export function PayoutCredentialsEditor({ onUpdated }: Props) {
  const [profile, setProfile] = useState<PayoutCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodValue>(PAYOUT_METHODS[0].value);
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await payoutCredentialsService.get();
      setProfile(data);
      if (!data.configured) setEditing(true);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load payout credentials"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setPayoutMethod(PAYOUT_METHODS[0].value);
    setPayoutAccount("");
    setPayoutAccountName("");
    setVerificationCode("");
    setCodeSent(false);
  };

  const startEdit = () => {
    resetForm();
    setEditing(true);
  };

  const cancelEdit = () => {
    resetForm();
    setEditing(false);
  };

  const sendCode = async () => {
    setSendingCode(true);
    try {
      const res = await payoutCredentialsService.sendVerification();
      setCodeSent(true);
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not send verification code"));
    } finally {
      setSendingCode(false);
    }
  };

  const save = async () => {
    if (!payoutAccount.trim()) {
      toast.error("Enter your payout account or phone number");
      return;
    }
    if (!payoutAccountName.trim()) {
      toast.error("Enter the name registered on this account");
      return;
    }
    if (profile?.configured && !verificationCode.trim()) {
      toast.error("Enter the verification code sent to your email");
      return;
    }

    setSaving(true);
    try {
      const accountValue = payoutAccount.trim();
      const updated = await payoutCredentialsService.set({
        payout_method: payoutMethod,
        payout_details: {
          account: accountValue,
          account_name: payoutAccountName.trim(),
          ...(payoutMethod === "momo_code" ? { momo_code: accountValue } : {}),
        },
        verification_code: profile?.configured ? verificationCode.trim() : undefined,
      });
      setProfile(updated);
      setEditing(false);
      resetForm();
      onUpdated?.(updated);
      toast.success(
        profile?.configured
          ? "Payout credentials updated"
          : "Payout credentials registered — withdrawals will use this account",
      );
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not save payout credentials"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading payout account…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4 text-emerald-700" />
          Registered payout account
        </CardTitle>
        <CardDescription>
          All withdrawals are paid only to this account. Changing it requires email verification on your owner login.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {!editing && profile?.configured ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  Active payout destination
                </p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {payoutMethodLabel(profile.payout_method ?? "")}
                </p>
                <p className="text-sm font-mono text-slate-700 mt-1">
                  {profile.payout_account_masked}
                </p>
                <p className="text-sm text-slate-600">{profile.payout_account_name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={startEdit}>
              Change payout account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {profile?.configured && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                For your security, we will email a verification code to your owner account before saving changes.
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Payout method</Label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethodValue)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {PAYOUT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{selectedPayoutMethod(payoutMethod).accountLabel}</Label>
              <Input
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={selectedPayoutMethod(payoutMethod).accountPlaceholder}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Name on account</Label>
              <Input
                value={payoutAccountName}
                onChange={(e) => setPayoutAccountName(e.target.value)}
                placeholder="Full legal name on bank / MoMo wallet"
              />
            </div>

            {profile?.configured && (
              <div className="space-y-2 pt-1 border-t">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => void sendCode()}
                    disabled={sendingCode}
                  >
                    {sendingCode ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    Send code to owner email
                  </Button>
                  {codeSent && (
                    <span className="text-[11px] text-emerald-700 font-medium">Code sent — check your inbox</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Email verification code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => void save()} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {profile?.configured ? "Save with verification" : "Register payout account"}
              </Button>
              {profile?.configured && (
                <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Need help? See{" "}
          <Link href="/support" className="text-farumasi-600 hover:underline">Support</Link> or contact FARUMASI finance.
        </p>
      </CardContent>
    </Card>
  );
}
