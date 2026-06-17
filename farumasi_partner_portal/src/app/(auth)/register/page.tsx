"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Wallet,
  Shield,
  Upload,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { partnerService } from "@/lib/services/partner.service";
import { payoutCredentialsService } from "@/lib/services/payout-credentials.service";
import { uploadService } from "@/lib/services/upload.service";
import { PAYOUT_METHODS, selectedPayoutMethod, type PayoutMethodValue } from "@/lib/payout-methods";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

const STEPS = ["Business Info", "Location", "License & Fees", "Payout", "Account"];
const PLATFORM_COMMISSION_PERCENT = 10;
const REGULATORY_AUTHORITIES = ["RFDA", "RDB", "RBC", "Other regulatory authority"];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Distributor");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [district, setDistrict] = useState("Kigali");
  const [sector, setSector] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [regulatoryAuthority, setRegulatoryAuthority] = useState("RFDA");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseFileName, setLicenseFileName] = useState("");
  const [agreedToCommission, setAgreedToCommission] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodValue>(PAYOUT_METHODS[0].value);
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
        toast.success("Location captured.");
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location. Enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const completePartnerProfile = async (accessToken: string, refreshToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("farumasi_partner_token", accessToken);
      localStorage.setItem("farumasi_partner_refresh", refreshToken);
    }

    let licenseDocumentUrl: string | undefined;
    if (licenseFile) {
      licenseDocumentUrl = await uploadService.uploadLicenseDocument(licenseFile);
    }

    await partnerService.updateMine({
      name: businessName.trim(),
      company_type: businessType.toLowerCase(),
      email: (businessEmail || email).trim(),
      phone: businessPhone.trim() || undefined,
      address: [address.trim(), sector.trim()].filter(Boolean).join(", ") || undefined,
      district: district.trim() || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      business_registration_number: registrationNumber.trim() || undefined,
      regulatory_authority: regulatoryAuthority.trim() || undefined,
      regulatory_license_number: licenseNumber.trim() || undefined,
      regulatory_license_document_url: licenseDocumentUrl,
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
    setSession({ access_token: accessToken, refresh_token: refreshToken, token_type: "bearer" }, me);
    toast.success("Application submitted. We will review your license and activate your account.");
    router.push("/dashboard");
  };

  const handleRegister = async () => {
    if (submitting) return;
    if (!agreedToTerms) {
      toast.error("Please accept the Terms of Service and Partner Agreement.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: businessPhone.trim() || undefined,
        role: "partner_company_admin",
      });
      setPendingVerification(true);
      toast.success("Verification code sent — check your email or phone.");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (submitting) return;
    if (!otp.trim()) {
      toast.error("Enter the verification code.");
      return;
    }
    setSubmitting(true);
    try {
      const tokens = await authService.verifyRegistration(email.trim(), otp.trim());
      await completePartnerProfile(tokens.access_token, tokens.refresh_token);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Verification failed. Check the code and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await authService.resendRegistrationOtp(email.trim());
      toast.success("A new verification code was sent.");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not resend code."));
    }
  };

  const validateStep = (): boolean => {
    if (step === 0 && !businessName.trim()) {
      toast.error("Please enter your business name.");
      return false;
    }
    if (step === 1) {
      if (!district.trim()) {
        toast.error("Please enter your city or district.");
        return false;
      }
      if (latitude == null || longitude == null) {
        toast.error("Please capture or enter your business coordinates.");
        return false;
      }
    }
    if (step === 2) {
      if (!licenseNumber.trim()) {
        toast.error("Enter your regulatory license number.");
        return false;
      }
      if (!licenseFile) {
        toast.error("Upload your license or approval document.");
        return false;
      }
      if (!agreedToCommission) {
        toast.error(`Please accept the ${PLATFORM_COMMISSION_PERCENT}% platform commission.`);
        return false;
      }
    }
    if (step === 3) {
      if (!payoutAccount.trim()) {
        toast.error("Enter your payout account or phone number.");
        return false;
      }
      if (!payoutAccountName.trim()) {
        toast.error("Enter the legal name on this payout account.");
        return false;
      }
    }
    if (step === 4) {
      if (!fullName.trim() || !email.trim() || !password) {
        toast.error("Please fill in name, email, and password.");
        return false;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return false;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return false;
      }
      if (!agreedToTerms) {
        toast.error("Please accept the Terms of Service and Partner Agreement.");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void handleRegister();
    }
  };

  const back = () => {
    if (pendingVerification) {
      setPendingVerification(false);
      setOtp("");
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  };

  const stepIcons = [Building2, MapPin, Shield, Wallet, User];
  const StepIcon = pendingVerification ? Mail : stepIcons[step];

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg bg-white border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-farumasi-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-farumasi-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Verify your email</h2>
              <p className="text-xs text-muted-foreground">
                Enter the code sent to <strong>{email}</strong>
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Verification code</Label>
              <Input
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              After verification we will save your business profile, license, and payout details.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={back} disabled={submitting}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button className="flex-1" onClick={() => void handleVerifyAndSubmit()} disabled={submitting}>
                {submitting ? "Submitting…" : "Verify & Submit Application"}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              className="text-xs text-farumasi-600 font-medium hover:underline"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < step
                    ? "bg-farumasi-600 text-white"
                    : i === step
                      ? "bg-farumasi-600 text-white ring-4 ring-farumasi-200"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
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
              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </p>
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
                  {["Pharmacy", "Distributor", "Manufacturer", "Clinic"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBusinessType(t)}
                      className={`text-xs border rounded-lg py-2 px-3 hover:border-farumasi-500 hover:bg-farumasi-50 transition-colors text-left font-medium ${
                        businessType === t ? "border-farumasi-500 bg-farumasi-50" : "border-border"
                      }`}
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">
                    Business coordinates <span className="text-red-500">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
                    {locating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Locating…
                      </>
                    ) : (
                      "Use my location"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used for delivery routing and showing your business on the patient map.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-1.9403"
                      value={latitude ?? ""}
                      onChange={(e) => setLatitude(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="30.0588"
                      value={longitude ?? ""}
                      onChange={(e) => setLongitude(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-blue-900">
                Upload your operating license or approval from RFDA or another competent authority.
              </p>
              <div className="space-y-1.5">
                <Label>Regulatory authority <span className="text-red-500">*</span></Label>
                <select
                  value={regulatoryAuthority}
                  onChange={(e) => setRegulatoryAuthority(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {REGULATORY_AUTHORITIES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>License / approval number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. PH/2024/00123"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>License document <span className="text-red-500">*</span></Label>
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-farumasi-400 hover:bg-farumasi-50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {licenseFileName || "Upload PDF or photo of license"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">JPEG, PNG, WebP, or PDF — max 10 MB</span>
                </button>
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setLicenseFile(f);
                    setLicenseFileName(f.name);
                  }}
                />
              </div>
              <div className="rounded-xl border border-farumasi-200 bg-farumasi-50 p-4 space-y-2">
                <p className="text-sm font-bold text-farumasi-800">Platform commission: {PLATFORM_COMMISSION_PERCENT}%</p>
                <p className="text-xs text-farumasi-900/80 leading-relaxed">
                  FARUMASI charges a minimum {PLATFORM_COMMISSION_PERCENT}% commission on product subtotals per order.
                  This is deducted before your net earnings are credited. Admins may propose a different rate later,
                  which you must approve in Requests.
                </p>
                <label className="flex items-start gap-2 text-xs text-farumasi-900 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded mt-0.5"
                    checked={agreedToCommission}
                    onChange={(e) => setAgreedToCommission(e.target.checked)}
                  />
                  I understand and accept the {PLATFORM_COMMISSION_PERCENT}% platform commission on sales.
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
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

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                You may use the same email or phone as your FARUMASI patient account. Partner and patient
                accounts are separate — only duplicate partner emails are blocked.
              </p>
              <div className="space-y-1.5">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Account administrator name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input type="email" placeholder="admin@company.rw" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Password <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded mt-0.5"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>
                  I agree to FARUMASI&apos;s{" "}
                  <Link href="/terms" target="_blank" className="text-farumasi-600 font-medium hover:underline">
                    Partner Terms & Agreement
                  </Link>
                </span>
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
                ? "Please wait…"
                : step === STEPS.length - 1
                  ? "Send Verification Code"
                  : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-farumasi-600 font-medium hover:underline">Sign in</Link>
          {" · "}
          <Link href="/terms" className="text-farumasi-600 font-medium hover:underline">Partner Terms</Link>
        </p>
      </div>
    </div>
  );
}
