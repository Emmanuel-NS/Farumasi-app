"use client";

import { useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { getApiError } from "@/lib/services/auth.service";
import {
  adminManagementService,
  type DraftPartnerPayload,
  type DraftPharmacyPayload,
} from "@/lib/services/admin-management.service";
import { Building2, CheckCircle2 } from "lucide-react";

type SellerKind = "pharmacy" | "partner";

interface OnboardSellerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  kind: SellerKind;
}

export function OnboardSellerModal({ open, onClose, onCreated, kind }: OnboardSellerModalProps) {
  const [entityName, setEntityName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyType, setCompanyType] = useState("distributor");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [license, setLicense] = useState("");
  const [licenseDocUrl, setLicenseDocUrl] = useState("");
  const [supervisingName, setSupervisingName] = useState("");
  const [supervisingLicense, setSupervisingLicense] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regulatoryAuthority, setRegulatoryAuthority] = useState("RFDA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; entityId: string } | null>(null);

  const title = kind === "pharmacy" ? "Draft pharmacy for application" : "Draft partner company for application";

  function reset() {
    setEntityName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setDistrict("");
    setLatitude("");
    setLongitude("");
    setLicense("");
    setLicenseDocUrl("");
    setSupervisingName("");
    setSupervisingLicense("");
    setRegNumber("");
    setError(null);
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityName.trim()) {
      setError("Business name is required");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (kind === "pharmacy") {
        const payload: DraftPharmacyPayload = {
          name: entityName.trim(),
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
          address: address.trim() || undefined,
          district: district.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          license_number: license.trim() || undefined,
          license_document_url: licenseDocUrl.trim() || undefined,
          supervising_pharmacist_name: supervisingName.trim() || undefined,
          supervising_pharmacist_license: supervisingLicense.trim() || undefined,
        };
        const res = await adminManagementService.draftPharmacy(payload);
        setResult({ name: res.name, entityId: res.pharmacy_id ?? "" });
      } else {
        const payload: DraftPartnerPayload = {
          name: entityName.trim(),
          company_type: companyType,
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
          address: address.trim() || undefined,
          district: district.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          business_registration_number: regNumber.trim() || undefined,
          regulatory_authority: regulatoryAuthority.trim() || undefined,
          regulatory_license_number: license.trim() || undefined,
          regulatory_license_document_url: licenseDocUrl.trim() || undefined,
        };
        const res = await adminManagementService.draftPartner(payload);
        setResult({ name: res.name, entityId: res.partner_company_id ?? "" });
      }
      onCreated();
    } catch (err) {
      setError(getApiError(err, "Could not save draft"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Draft saved</p>
              <p className="mt-1">
                <strong>{result.name}</strong> will appear on the public partner portal application page.
                The owner selects it, completes their application, and FARUMASI approves before trading begins.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <p className="text-xs text-slate-500">
            No owner account is created. The business owner applies separately and their submission is reviewed before activation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Business name *" value={entityName} onChange={(e) => setEntityName(e.target.value)} required className="sm:col-span-2" />
            <Input label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <Input label="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            {kind === "partner" && (
              <Select label="Company type" value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                <option value="distributor">Distributor</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="healthcare">Healthcare company</option>
                <option value="other">Other</option>
              </Select>
            )}
            <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2" />
            <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.9441" />
            <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="30.0619" />
            {kind === "pharmacy" ? (
              <>
                <Input label="Pharmacy license number" value={license} onChange={(e) => setLicense(e.target.value)} />
                <Input label="License document URL" value={licenseDocUrl} onChange={(e) => setLicenseDocUrl(e.target.value)} />
                <Input label="Supervising pharmacist" value={supervisingName} onChange={(e) => setSupervisingName(e.target.value)} />
                <Input label="Pharmacist license #" value={supervisingLicense} onChange={(e) => setSupervisingLicense(e.target.value)} />
              </>
            ) : (
              <>
                <Input label="Registration number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
                <Input label="Regulatory authority" value={regulatoryAuthority} onChange={(e) => setRegulatoryAuthority(e.target.value)} />
                <Input label="Regulatory license #" value={license} onChange={(e) => setLicense(e.target.value)} />
                <Input label="License document URL" value={licenseDocUrl} onChange={(e) => setLicenseDocUrl(e.target.value)} />
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <Building2 className="w-3.5 h-3.5" /> Save draft
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
