"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ArrowLeft, Building2, User, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { partnerService } from "@/lib/services/partner.service";
import { payoutCredentialsService } from "@/lib/services/payout-credentials.service";
import { PAYOUT_METHODS, selectedPayoutMethod, type PayoutMethodValue } from "@/lib/payout-methods";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

const STEPS = ["Business Info", "Contact & Location", "Payout Account", "Account"];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Distributor");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [district, setDistrict] = useState("Kigali");
  const [sector, setSector] = useState("");
  const [address, setAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodValue>(PAYOUT_METHODS[0].value);
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    if (!payoutAccount.trim() || !payoutAccountName.trim()) {
      toast.error("Please complete payout account details.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in name, email, and password.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const tokens = await authService.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: businessPhone.trim() || undefined,
        role: "partner_company_admin",
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("farumasi_partner_token", tokens.access_token);
        localStorage.setItem("farumasi_partner_refresh", tokens.refresh_token);
      }
      await partnerService.updateMine({
        name: businessName.trim(),
        company_type: businessType.toLowerCase(),
        email: (businessEmail || email).trim(),
        phone: businessPhone.trim() || undefined,
        address: [address.trim(), sector.trim()].filter(Boolean).join(", ") || undefined,
        district: district.trim() || undefined,
        business_registration_number: registrationNumber.trim() || undefined,
      });
      const accountValue = payoutAccount.trim();
      await payoutCredentialsService.set({
        payout_method: payoutMethod,
        payout_details: {
          account: accountValue,
          account_name: payoutAccountName.trim(),
          ...(payoutMethod === "momo_code" ? { momo_code: accountValue } : {}),
        },
      });
      const me = await authService.getMe();
      setSession(tokens, me);
      toast.success("Application submitted. Payout account registered.");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0 && !businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    if (step === 2) {
      if (!payoutAccount.trim()) {
        toast.error("Enter your payout account or phone number.");
        return;
      }
      if (!payoutAccountName.trim()) {
        toast.error("Enter the legal name on this payout account.");
        return;
      }
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  };
  const back = () => step > 0 && setStep((s) => s - 1);

  const stepIcons = [Building2, MapPin, Wallet, User];
  const StepIcon = stepIcons[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-farumasi-100 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
          </div>
          <span className="font-bold text-foreground">FARUMASI Partner Portal</span>
        </div>

        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? "bg-farumasi-600 text-white" : i === step ? "bg-farumasi-600 text-white ring-4 ring-farumasi-200" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-farumasi-600" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-farumasi-100 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-farumasi-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{STEPS[step]}</h2>
              <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Business Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Inyange Pharmacy Ltd" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Business Type <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Pharmacy", "Distributor", "Manufacturer", "Clinic"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBusinessType(t)}
                      className={`text-xs border rounded-lg py-2 px-3 hover:border-farumasi-500 hover:bg-farumasi-50 transition-colors text-left font-medium ${businessType === t ? "border-farumasi-500 bg-farumasi-50" : "border-border"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Business Registration Number</Label>
                <Input placeholder="RCA/xxx/2024" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>City / District <span className="text-red-500">*</span></Label>
                  <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sector</Label>
                  <Input placeholder="e.g. Nyarugenge" value={sector} onChange={(e) => setSector(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Street Address</Label>
                <Input placeholder="e.g. KN 4 Ave" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Business Phone</Label>
                <Input placeholder="+250 788 000 000" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Business Email</Label>
                <Input type="email" placeholder="admin@company.rw" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-900">
                Withdrawals are paid only to this account. You can change it later in Business Profile with email verification.
              </p>
              <div className="space-y-1.5">
                <Label>Payout method <span className="text-red-500">*</span></Label>
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
                <Label>{selectedPayoutMethod(payoutMethod).accountLabel} <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={selectedPayoutMethod(payoutMethod).accountPlaceholder}
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name on account <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Legal name registered with bank / MoMo"
                  value={payoutAccountName}
                  onChange={(e) => setPayoutAccountName(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Full Name <span className="text-red-500">*</span></Label><Input placeholder="Account administrator name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email Address <span className="text-red-500">*</span></Label><Input type="email" placeholder="admin@company.rw" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Password <span className="text-red-500">*</span></Label><Input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Confirm Password <span className="text-red-500">*</span></Label><Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
                <input type="checkbox" className="w-3.5 h-3.5 rounded mt-0.5" />
                I agree to FARUMASI&apos;s Terms of Service and Partner Agreement
              </label>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" className="gap-1.5" onClick={back} disabled={submitting}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <Button className="flex-1 gap-2" onClick={next} disabled={submitting}>
              {submitting
                ? "Submitting…"
                : step === STEPS.length - 1
                  ? "Submit Application"
                  : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-farumasi-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
