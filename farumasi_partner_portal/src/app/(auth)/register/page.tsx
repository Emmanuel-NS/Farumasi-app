"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ArrowLeft, Building2, User, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

const STEPS = ["Business Info", "Contact & Location", "Documents", "Account"];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [businessPhone, setBusinessPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async () => {
    if (submitting) return;
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
        role: "pharmacy_admin",
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("farumasi_partner_token", tokens.access_token);
      }
      const me = await authService.getMe();
      setSession(tokens, me);
      toast.success("Application submitted. Welcome to FARUMASI.");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  };
  const back = () => step > 0 && setStep((s) => s - 1);

  const stepIcons = [Building2, MapPin, FileText, User];
  const StepIcon = stepIcons[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-farumasi-100 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
          </div>
          <span className="font-bold text-foreground">FARUMASI Partner Portal</span>
        </div>

        {/* Progress */}
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

        {/* Card */}
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
              <div className="space-y-1.5"><Label>Business Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Inyange Pharmacy Ltd" /></div>
              <div className="space-y-1.5"><Label>Business Type <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Pharmacy", "Distributor", "Manufacturer", "Clinic"].map(t => (
                    <button key={t} className="text-xs border border-border rounded-lg py-2 px-3 hover:border-farumasi-500 hover:bg-farumasi-50 transition-colors text-left font-medium first:border-farumasi-500 first:bg-farumasi-50">{t}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><Label>Business Registration Number <span className="text-red-500">*</span></Label><Input placeholder="RCA/xxx/2024" /></div>
              <div className="space-y-1.5"><Label>Tax ID (TIN)</Label><Input placeholder="100XXXXXXX" /></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>City / District <span className="text-red-500">*</span></Label><Input defaultValue="Kigali" /></div>
                <div className="space-y-1.5"><Label>Sector</Label><Input placeholder="e.g. Nyarugenge" /></div>
              </div>
              <div className="space-y-1.5"><Label>Street Address <span className="text-red-500">*</span></Label><Input placeholder="e.g. KN 4 Ave" /></div>
              <div className="space-y-1.5"><Label>Business Phone <span className="text-red-500">*</span></Label><Input placeholder="+250 788 000 000" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Business Email <span className="text-red-500">*</span></Label><Input type="email" placeholder="admin@pharmacy.rw" /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Upload your compliance documents. All are required for verification.</p>
              {["Business Registration Certificate", "Pharmacy Operating License", "RFDA Dispensing License", "Tax Clearance Certificate"].map(doc => (
                <div key={doc} className="flex items-center justify-between border border-dashed border-border rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs font-medium">{doc}</p>
                    <p className="text-[11px] text-muted-foreground">PDF, max 5MB</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7">Upload</Button>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Full Name <span className="text-red-500">*</span></Label><Input placeholder="Account administrator name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email Address <span className="text-red-500">*</span></Label><Input type="email" placeholder="admin@pharmacy.rw" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
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
