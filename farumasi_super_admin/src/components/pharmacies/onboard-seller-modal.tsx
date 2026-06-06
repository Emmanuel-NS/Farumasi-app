"use client";

import { useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { getApiError } from "@/lib/services/auth.service";
import {
  adminManagementService,
  type OnboardPartnerPayload,
  type OnboardPharmacyPayload,
} from "@/lib/services/admin-management.service";
import { Building2, Copy, CheckCircle2 } from "lucide-react";

type SellerKind = "pharmacy" | "partner";

interface OnboardSellerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  kind: SellerKind;
}

export function OnboardSellerModal({ open, onClose, onCreated, kind }: OnboardSellerModalProps) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [entityName, setEntityName] = useState("");
  const [companyType, setCompanyType] = useState("healthcare");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [commission, setCommission] = useState("10");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [license, setLicense] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string; entityId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const title = kind === "pharmacy" ? "Register pharmacy partner" : "Register healthcare company";

  function reset() {
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setEntityName("");
    setAddress("");
    setDistrict("");
    setCommission("10");
    setLatitude("");
    setLongitude("");
    setLogoUrl("");
    setLicense("");
    setRegNumber("");
    setTempPassword("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const commissionNum = parseFloat(commission);
    if (Number.isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setError("Commission must be between 0 and 100");
      setLoading(false);
      return;
    }

    try {
      if (kind === "pharmacy") {
        const payload: OnboardPharmacyPayload = {
          owner_full_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          owner_phone: ownerPhone.trim() || undefined,
          temporary_password: tempPassword.trim() || undefined,
          name: entityName.trim(),
          address: address.trim() || undefined,
          district: district.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          license_number: license.trim() || undefined,
          commission_rate_percent: commissionNum,
          logo_url: logoUrl.trim() || undefined,
        };
        const res = await adminManagementService.onboardPharmacy(payload);
        setResult({
          email: res.owner.email,
          password: res.temporary_password,
          entityId: res.pharmacy_id ?? "",
        });
      } else {
        const payload: OnboardPartnerPayload = {
          owner_full_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          owner_phone: ownerPhone.trim() || undefined,
          temporary_password: tempPassword.trim() || undefined,
          name: entityName.trim(),
          company_type: companyType,
          address: address.trim() || undefined,
          district: district.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          business_registration_number: regNumber.trim() || undefined,
          commission_rate_percent: commissionNum,
          logo_url: logoUrl.trim() || undefined,
        };
        const res = await adminManagementService.onboardPartner(payload);
        setResult({
          email: res.owner.email,
          password: res.temporary_password,
          entityId: res.partner_company_id ?? "",
        });
      }
      onCreated();
    } catch (err) {
      setError(getApiError(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `Email: ${result.email}\nTemporary password: ${result.password}\nPartner must set a new password, location (if missing), and upload logo on first login.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Partner registered</p>
              <p className="mt-1">Agreed commission: {commission}% · Entity ID: {result.entityId.slice(0, 8)}…</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm font-mono">
            <p>
              <span className="text-slate-500">Owner email:</span> {result.email}
            </p>
            <p>
              <span className="text-slate-500">Temp password:</span> {result.password}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={copyCredentials}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy credentials"}
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Owner full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            <Input label="Owner email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
            <Input label="Owner phone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
            <Input label="Temp password (optional)" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">
            {kind === "pharmacy" ? "Pharmacy details" : "Company details"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Business name" value={entityName} onChange={(e) => setEntityName(e.target.value)} required />
            {kind === "partner" && (
              <Select label="Company type" value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                <option value="healthcare">Healthcare company</option>
                <option value="insurance">Insurance</option>
                <option value="distributor">Distributor</option>
                <option value="other">Other</option>
              </Select>
            )}
            {kind === "pharmacy" && (
              <Input label="License number" value={license} onChange={(e) => setLicense(e.target.value)} />
            )}
            {kind === "partner" && (
              <Input label="Registration number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            )}
            <Input label="Agreed commission (%)" type="number" min={0} max={100} step={0.5} value={commission} onChange={(e) => setCommission(e.target.value)} required />
            <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2" />
            <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.9441" />
            <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="30.0619" />
            <Input label="Logo URL (optional — partner can upload on first login)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="sm:col-span-2" />
          </div>

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <Building2 className="w-3.5 h-3.5" /> Register partner
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
