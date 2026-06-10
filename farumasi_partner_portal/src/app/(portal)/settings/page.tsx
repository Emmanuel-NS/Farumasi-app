"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Settings,
  Building2,
  Lock,
  Loader2,
  Save,
  MapPin,
  ImageIcon,
  Mail,
  Phone,
  MapPinned,
  ShieldCheck,
  Store,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PendingChangeRequestsCard } from "@/components/shared/pending-change-requests";
import { BusinessProfileCommissionCard } from "@/components/settings/business-profile-commission-card";
import { PayoutCredentialsEditor } from "@/components/settings/payout-credentials-editor";
import { StoreOpenToggle } from "@/components/shared/store-open-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, mediaUrl } from "@/lib/utils";
import { toast } from "@/lib/toast";
import api, { getApiError } from "@/lib/api";
import { getSellerMeBase } from "@/lib/seller-api";
import {
  partnerService,
  type BackendPartnerCompany,
  type PartnerCompanyUpdatePayload,
} from "@/lib/services/partner.service";
import {
  sellerChangeRequestsService,
  type SellerChangeRequest,
} from "@/lib/services/seller-change-requests.service";
import { useAuthStore } from "@/lib/store/auth";
import { authService } from "@/lib/services/auth.service";

interface PharmacyProfile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_open: boolean;
  verification_status?: string | null;
  status?: string | null;
  created_at?: string;
  commission_rate_percent?: number | null;
  effective_commission_rate_percent?: number | null;
  commission_rate_source?: string | null;
}

function statusBadgeClass(status?: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "verified" || s === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "rejected" || s === "suspended") return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isPharmacyAdmin = user?.role === "pharmacy_admin" || user?.role === "pharmacist";
  const [partner, setPartner] = useState<BackendPartnerCompany | null>(null);
  const [pharmacy, setPharmacy] = useState<PharmacyProfile | null>(null);
  const [pendingChanges, setPendingChanges] = useState<SellerChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PartnerCompanyUpdatePayload>({});
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({ current: false, next: false });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!user?.role) return;
    let cancelled = false;
    const load = async () => {
      try {
        const pendingPromise = sellerChangeRequestsService.listPending().catch(() => [] as SellerChangeRequest[]);
        if (isPharmacyAdmin) {
          const [{ data }, pending] = await Promise.all([
            api.get<PharmacyProfile>(`${getSellerMeBase()}`),
            pendingPromise,
          ]);
          if (cancelled) return;
          setPharmacy(data);
          setPendingChanges(pending);
          setForm({
            name: data.name,
            address: data.address ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            district: data.district ?? "",
            logo_url: data.logo_url ?? "",
            latitude: data.latitude ?? undefined,
            longitude: data.longitude ?? undefined,
            is_open: data.is_open ?? true,
          });
        } else {
          const [p, pending] = await Promise.all([partnerService.getMine(), pendingPromise]);
          if (cancelled) return;
          setPartner(p);
          setPendingChanges(pending);
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
        }
      } catch (err: unknown) {
        if (!cancelled) toast.error(getApiError(err, "Failed to load business profile"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.role, isPharmacyAdmin]);

  const pendingCommissionChange = useMemo(() => {
    const row = pendingChanges.find(
      (r) => r.status === "pending" && r.field_name === "commission_rate_percent",
    );
    return row?.proposed_value ?? null;
  }, [pendingChanges]);

  const commissionProfile = isPharmacyAdmin ? pharmacy : partner;
  const displayName = pharmacy?.name ?? partner?.name;
  const logoPreview = mediaUrl(form.logo_url || pharmacy?.logo_url || partner?.logo_url);
  const isOpen = form.is_open ?? pharmacy?.is_open ?? partner?.is_open ?? true;
  const verificationStatus = partner?.verification_status ?? pharmacy?.verification_status;
  const accountStatus = partner?.status ?? pharmacy?.status;
  const memberSince = partner?.created_at ?? pharmacy?.created_at;

  const save = async () => {
    if (!user?.role) return;
    setSaving(true);
    try {
      if (isPharmacyAdmin) {
        const { data } = await api.patch<PharmacyProfile>(`${getSellerMeBase()}`, form);
        setPharmacy(data);
      } else {
        const updated = await partnerService.updateMine(form);
        setPartner(updated);
      }
      toast.success("Business profile saved");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const { current, next, confirm } = pwForm;
    if (!current || !next || !confirm) { toast.error("Fill all password fields"); return; }
    if (next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (next !== confirm) { toast.error("Passwords don't match"); return; }
    setPwSaving(true);
    try {
      await authService.changePassword(current, next);
      toast.success("Password changed successfully");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to change password"));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <PageHeader
        title="Business Profile"
        description="How patients and FARUMASI see your store — identity, location, and commercial terms"
        icon={Building2}
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-farumasi-600" /> Loading profile…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity hero */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-r from-farumasi-600 to-teal-700 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-white/30 bg-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-white/70" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-farumasi-100 mb-1">
                    {isPharmacyAdmin ? "Pharmacy seller" : "Partner company"}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold truncate">{displayName ?? "Your business"}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge
                      className={cn(
                        "border font-semibold",
                        isOpen
                          ? "bg-emerald-500/20 text-white border-emerald-300/40"
                          : "bg-white/10 text-farumasi-100 border-white/20",
                      )}
                    >
                      {isOpen ? "Open for orders" : "Closed"}
                    </Badge>
                    {verificationStatus && (
                      <Badge className={cn("border capitalize", statusBadgeClass(verificationStatus))}>
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {verificationStatus.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {accountStatus && (
                      <Badge className="bg-white/10 text-white border-white/20 capitalize">
                        {accountStatus}
                      </Badge>
                    )}
                    {form.district && (
                      <span className="text-xs text-farumasi-100 flex items-center gap-1">
                        <MapPinned className="w-3.5 h-3.5" /> {form.district}
                      </span>
                    )}
                  </div>
                  {memberSince && (
                    <p className="text-xs text-farumasi-100/80 mt-2">
                      On FARUMASI since {formatDate(memberSince, true)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="py-4 px-5 sm:px-8 bg-slate-50/80 border-t border-slate-100">
              <StoreOpenToggle />
            </CardContent>
          </Card>

          <PendingChangeRequestsCard />

          <BusinessProfileCommissionCard
            profile={commissionProfile}
            pendingRateChange={pendingCommissionChange}
          />

          <PayoutCredentialsEditor />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-farumasi-600" /> Company details
                </CardTitle>
                <CardDescription>Public-facing information on the patient store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl border bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Store image URL</Label>
                    <Input
                      value={form.logo_url ?? ""}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="https://… or /media/…"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </Label>
                    <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>District</Label>
                    <Input
                      value={form.district ?? ""}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  {!isPharmacyAdmin && (
                    <div className="space-y-1.5">
                      <Label>Business type</Label>
                      <Input
                        value={form.company_type ?? ""}
                        onChange={(e) => setForm({ ...form, company_type: e.target.value })}
                        placeholder="Distributor, retail…"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Street address</Label>
                  <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                {!isPharmacyAdmin && (
                  <>
                    <div className="space-y-1.5">
                      <Label>About your business</Label>
                      <Textarea
                        rows={3}
                        value={form.description ?? ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Short description for patients"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Registration number</Label>
                      <Input
                        value={form.business_registration_number ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, business_registration_number: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4 text-farumasi-600" /> Location
                  </CardTitle>
                  <CardDescription>Used for delivery routing and patient map tracking</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="w-4 h-4 text-farumasi-600" /> Login account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <p>
                      <span className="text-muted-foreground">Signed in as </span>
                      <span className="font-medium">{user?.full_name ?? user?.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <Badge variant="outline" className="capitalize font-normal">
                      {user?.role?.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Agreement copies and withdrawal history are in{" "}
                      <Link href="/requests" className="text-farumasi-600 font-medium hover:underline">
                        Requests
                      </Link>
                      .
                    </p>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <p className="font-medium flex items-center gap-1.5 text-sm">
                      <KeyRound className="w-3.5 h-3.5 text-farumasi-600" /> Change Password
                    </p>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={pwShow.current ? "text" : "password"}
                          placeholder="Current password"
                          value={pwForm.current}
                          onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                          className="pr-9 text-sm"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setPwShow((s) => ({ ...s, current: !s.current }))}
                        >
                          {pwShow.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={pwShow.next ? "text" : "password"}
                          placeholder="New password (min 8 characters)"
                          value={pwForm.next}
                          onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                          className="pr-9 text-sm"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setPwShow((s) => ({ ...s, next: !s.next }))}
                        >
                          {pwShow.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={changePassword}
                      disabled={pwSaving}
                      className="w-full gap-1.5"
                    >
                      {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      Update password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Changes save to your live store profile immediately.
            </p>
            <Button onClick={save} disabled={saving} className="gap-1.5 sm:min-w-[140px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
