"use client";

import { useState } from "react";
import { Building2, Store, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { sellerOnboardingService, type DraftSellerOut } from "@/lib/services/seller-onboarding.service";

type Tab = "pharmacy" | "partner";

const inp =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-200";

export default function SellerOnboardPage() {
  const [tab, setTab] = useState<Tab>("pharmacy");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DraftSellerOut | null>(null);

  const [entityName, setEntityName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseDocUrl, setLicenseDocUrl] = useState("");
  const [supervisingName, setSupervisingName] = useState("");
  const [supervisingLicense, setSupervisingLicense] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [businessReg, setBusinessReg] = useState("");
  const [regulatoryAuthority, setRegulatoryAuthority] = useState("Rwanda FDA");
  const [regulatoryLicense, setRegulatoryLicense] = useState("");

  const reset = () => {
    setResult(null);
    setEntityName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setDistrict("");
    setLicenseNumber("");
    setLicenseDocUrl("");
    setSupervisingName("");
    setSupervisingLicense("");
    setCompanyType("");
    setBusinessReg("");
    setRegulatoryLicense("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res =
        tab === "pharmacy"
          ? await sellerOnboardingService.draftPharmacy({
              name: entityName.trim(),
              email: contactEmail.trim() || undefined,
              phone: contactPhone.trim() || undefined,
              address: address.trim() || undefined,
              district: district.trim() || undefined,
              license_number: licenseNumber.trim() || undefined,
              license_document_url: licenseDocUrl.trim() || undefined,
              supervising_pharmacist_name: supervisingName.trim() || undefined,
              supervising_pharmacist_license: supervisingLicense.trim() || undefined,
            })
          : await sellerOnboardingService.draftPartner({
              name: entityName.trim(),
              company_type: companyType.trim() || undefined,
              email: contactEmail.trim() || undefined,
              phone: contactPhone.trim() || undefined,
              address: address.trim() || undefined,
              district: district.trim() || undefined,
              business_registration_number: businessReg.trim() || undefined,
              regulatory_authority: regulatoryAuthority.trim() || undefined,
              regulatory_license_number: regulatoryLicense.trim() || undefined,
            });
      setResult(res);
      toast.success("Draft saved — owner can select it on the public application form");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(typeof e?.response?.data?.detail === "string" ? e.response.data.detail : "Could not save draft");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-5 space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Draft seller onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pre-register a pharmacy or partner shell without creating an owner account. The owner completes a separate public application and FARUMASI approves before trading begins.
        </p>
      </div>

      <div className="flex gap-2">
        {(["pharmacy", "partner"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              tab === t ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {t === "pharmacy" ? <Store className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            {t === "pharmacy" ? "Pharmacy" : "Partner company"}
          </button>
        ))}
      </div>

      {result ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 className="w-5 h-5" /> Draft ready
          </div>
          <p className="text-sm text-emerald-900">
            <strong>{result.name}</strong> will appear on the public partner portal application page.
            The owner can select it, adjust details, and submit their own application for review.
          </p>
          <button type="button" onClick={reset} className="text-sm text-slate-500 underline block">
            Create another draft
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-600">{tab === "pharmacy" ? "Pharmacy" : "Company"} name *</label>
              <input className={inp} value={entityName} onChange={(e) => setEntityName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Contact email</label>
              <input type="email" className={inp} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Contact phone</label>
              <input className={inp} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600">Address</label>
              <input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">District</label>
              <input className={inp} value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
          </div>

          {tab === "pharmacy" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Pharmacy license number</label>
                <input className={inp} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">License document URL</label>
                <input className={inp} value={licenseDocUrl} onChange={(e) => setLicenseDocUrl(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Supervising pharmacist</label>
                <input className={inp} value={supervisingName} onChange={(e) => setSupervisingName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Pharmacist license #</label>
                <input className={inp} value={supervisingLicense} onChange={(e) => setSupervisingLicense(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Company type</label>
                <input className={inp} value={companyType} onChange={(e) => setCompanyType(e.target.value)} placeholder="Distributor, retailer…" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Business registration #</label>
                <input className={inp} value={businessReg} onChange={(e) => setBusinessReg(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Regulatory authority</label>
                <input className={inp} value={regulatoryAuthority} onChange={(e) => setRegulatoryAuthority(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Regulatory license #</label>
                <input className={inp} value={regulatoryLicense} onChange={(e) => setRegulatoryLicense(e.target.value)} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save {tab} draft
          </button>
        </form>
      )}
    </div>
  );
}
