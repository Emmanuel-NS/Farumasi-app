"use client";

import { useEffect, useState } from "react";
import { Settings, Building2, Lock, Bell, CreditCard, Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { pharmacyService, type BackendPharmacy, type PharmacyUpdatePayload } from "@/lib/services/pharmacy.service";
import { useAuthStore } from "@/lib/store/auth";

const sections = [
  { id: "general", label: "General", icon: Building2 },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "banking", label: "Banking", icon: CreditCard },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-farumasi-600" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [active, setActive] = useState("general");
  const [pharmacy, setPharmacy] = useState<BackendPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PharmacyUpdatePayload>({});

  useEffect(() => {
    let cancelled = false;
    pharmacyService.getMine()
      .then(p => {
        if (cancelled) return;
        setPharmacy(p);
        setForm({
          name: p.name,
          address: p.address ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          is_open: p.is_open,
          accepts_delivery: p.accepts_delivery,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(getApiError(err, "Failed to load pharmacy"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await pharmacyService.updateMine(form);
      setPharmacy(updated);
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" description="Manage your business profile, security, and preferences" icon={Settings} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                active === s.id
                  ? "bg-farumasi-50 text-farumasi-700 font-medium"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : active === "general" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Profile</CardTitle>
                <CardDescription>Your public business identity on the FARUMASI platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Business Name</Label>
                    <Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>District</Label>
                    <Input value={pharmacy?.district ?? ""} disabled />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Address</Label>
                    <Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>License Number</Label>
                    <Input value={pharmacy?.license_number ?? "—"} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Pharmacy Open</p>
                      <p className="text-[11px] text-muted-foreground">Accept new orders</p>
                    </div>
                    <Toggle
                      checked={!!form.is_open}
                      onChange={v => setForm({ ...form, is_open: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Accept Delivery</p>
                      <p className="text-[11px] text-muted-foreground">Offer delivery service</p>
                    </div>
                    <Toggle
                      checked={!!form.accepts_delivery}
                      onChange={v => setForm({ ...form, accepts_delivery: v })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : active === "security" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Account Security</CardTitle>
                <CardDescription>Your account credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={user?.role ?? ""} disabled className="capitalize" />
                </div>
                <div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Password management </span>
                    is handled via the FARUMASI account portal. Contact support to change your password or enable two-factor authentication.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <p className="text-sm font-medium">Coming soon</p>
                <p className="text-xs text-muted-foreground">
                  This section is not yet available in the partner portal.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
