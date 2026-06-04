"use client";

import { useEffect, useState } from "react";
import { Settings, Building2, Lock, Loader2, Save, MapPin, Percent, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, mediaUrl } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  partnerService,
  type BackendPartnerCompany,
  type PartnerCompanyUpdatePayload,
} from "@/lib/services/partner.service";
import { useAuthStore } from "@/lib/store/auth";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [company, setCompany] = useState<BackendPartnerCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PartnerCompanyUpdatePayload>({});

  useEffect(() => {
    let cancelled = false;
    partnerService
      .getMine()
      .then((p) => {
        if (cancelled) return;
        setCompany(p);
        setForm({
          name: p.name,
          address: p.address ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          district: p.district ?? "",
          company_type: p.company_type ?? "",
          business_registration_number: p.business_registration_number ?? "",
          description: p.description ?? "",
          logo_url: p.logo_url ?? "",
          latitude: p.latitude ?? undefined,
          longitude: p.longitude ?? undefined,
          is_open: p.is_open ?? true,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(getApiError(err, "Failed to load business profile"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await partnerService.updateMine(form);
      setCompany(updated);
      toast.success("Business profile saved");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const logoPreview = mediaUrl(form.logo_url || company?.logo_url);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Business Profile"
        description="Your partner identity on FARUMASI — shown to patients when you fulfil orders"
        icon={Settings}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Company details
              </CardTitle>
              <CardDescription>Information patients and pharmacists see about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-20 h-20 rounded-2xl border bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  <Label>Pharmacy / store image URL</Label>
                  <Input
                    value={form.logo_url ?? ""}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://… or /media/…"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used on the patient portal pharmacy strip. Upload via your admin contact if you need hosting help.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Business name</Label>
                  <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>District</Label>
                  <Input value={form.district ?? ""} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Business type</Label>
                  <Input
                    value={form.company_type ?? ""}
                    onChange={(e) => setForm({ ...form, company_type: e.target.value })}
                    placeholder="e.g. distributor, retail pharmacy"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Street address</Label>
                  <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>About your business</Label>
                  <Textarea
                    rows={3}
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description for patients and staff"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration number</Label>
                  <Input
                    value={form.business_registration_number ?? ""}
                    onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={form.is_open !== false}
                      onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Open for orders (shown to patients)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </CardTitle>
              <CardDescription>Coordinates enable live map tracking on the patient app</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latitude: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="-1.9403"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      longitude: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="29.8739"
                />
              </div>
              <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                Tip: pick coordinates from Google Maps (right-click → copy lat/long). Keep accurate for delivery and “nearby pharmacy” features.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="w-4 h-4" /> Agreement & account status
              </CardTitle>
              <CardDescription>Managed by FARUMASI — contact support to change commission terms</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Commission rate</p>
                <p className="font-semibold">
                  {company?.commission_rate_percent != null
                    ? `${company.commission_rate_percent}%`
                    : "Platform default"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verification</p>
                <p className="font-semibold capitalize">{company?.verification_status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account status</p>
                <p className="font-semibold capitalize">{company?.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partner since</p>
                <p className="font-semibold">{company ? formatDate(company.created_at, true) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-4 h-4" /> Login account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Signed in as </span>
                <span className="font-medium">{user?.email}</span>
                <span className="text-muted-foreground"> ({user?.role})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Password changes are handled through FARUMASI account support.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
