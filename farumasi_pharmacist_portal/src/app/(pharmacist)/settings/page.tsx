"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Bell, Shield, Store, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  pharmaciesService,
  type BackendPharmacy,
} from "@/lib/services/pharmacies.service";

export default function SettingsPage() {
  const [open, setOpen] = useState<string | null>("general");
  const toggle = (id: string) => setOpen((p) => (p === id ? null : id));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your pharmacy and account</p>
      </div>

      <div className="space-y-3">
        <Accordion id="general" title="Pharmacy Profile" icon={Store} open={open} onToggle={toggle}>
          <GeneralSection />
        </Accordion>
        <Accordion id="security" title="Security" icon={Shield} open={open} onToggle={toggle}>
          <SecuritySection />
        </Accordion>
        <Accordion id="notifications" title="Notifications" icon={Bell} open={open} onToggle={toggle}>
          <NotificationsSection />
        </Accordion>
      </div>
    </div>
  );
}

function Accordion({ id, title, icon: Icon, open, onToggle, children }: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-farumasi-600" />
          <span className="text-base font-bold text-slate-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  );
}

const INP =
  "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all disabled:bg-slate-50";

/* ── General ─────────────────────────────────────────── */
function GeneralSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [pharmacy, setPharmacy] = useState<BackendPharmacy | null>(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "",
    is_open: true, accepts_delivery: false,
  });

  useEffect(() => {
    pharmaciesService.getMyPharmacy()
      .then((p) => {
        setPharmacy(p);
        setForm({
          name: p.name ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          address: p.address ?? "",
          is_open: p.is_open ?? true,
          accepts_delivery: p.accepts_delivery ?? false,
        });
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-farumasi-600" /></div>;
  }

  if (missing) {
    return (
      <p className="text-sm text-slate-600">
        You don&apos;t have a pharmacy attached to this account yet. Contact support to set one up.
      </p>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const updated = await pharmaciesService.updateMyPharmacy({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        is_open: form.is_open,
        accepts_delivery: form.accepts_delivery,
      });
      setPharmacy(updated);
      toast.success("Pharmacy updated");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pharmacy Name</label>
        <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={INP} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
        <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={INP} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={INP} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
        <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={INP} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Currently open</p>
          <p className="text-xs text-slate-500">When closed, your pharmacy is hidden from the patient store (no products or prices).</p>
        </div>
        <Toggle value={form.is_open} onChange={(v) => setForm((p) => ({ ...p, is_open: v }))} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Accepts delivery</p>
          <p className="text-xs text-slate-500">Enable courier delivery for orders.</p>
        </div>
        <Toggle value={form.accepts_delivery} onChange={(v) => setForm((p) => ({ ...p, accepts_delivery: v }))} />
      </div>

      {pharmacy?.license_number && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-500">License number</p>
          <p className="text-sm font-bold text-slate-900">{pharmacy.license_number}</p>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}

/* ── Security ─────────────────────────────────────────── */
function SecuritySection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (form.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (form.next !== form.confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: form.current,
        new_password: form.next,
      });
      toast.success("Password changed");
      setForm({ current: "", next: "", confirm: "" });
      setOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
        <div>
          <p className="text-sm font-semibold text-slate-900">Change Password</p>
          <p className="text-xs text-slate-500">Update your account password</p>
        </div>
        <button onClick={() => setOpen(true)} className="text-xs text-farumasi-600 font-semibold hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current password</label>
        <input type="password" value={form.current} onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))} className={INP} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">New password</label>
        <input type="password" value={form.next} onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))} className={INP} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm new password</label>
        <input type="password" value={form.confirm} onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} className={INP} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setForm({ current: "", next: "", confirm: "" }); }}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Update Password
        </button>
      </div>
    </div>
  );
}

/* ── Notifications ─────────────────────────────────────── */
interface NotificationPrefs {
  channels: { push: boolean; email: boolean; sms: boolean; whatsapp: boolean };
  events: { orders: boolean; health_tips: boolean; promotions: boolean; app_updates: boolean; reminders: boolean };
}

const DEFAULT_PREFS: NotificationPrefs = {
  channels: { push: true, email: true, sms: false, whatsapp: false },
  events: { orders: true, health_tips: true, promotions: false, app_updates: true, reminders: true },
};

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<NotificationPrefs>("/users/me/notification-preferences")
      .then(({ data }) => setPrefs(data))
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: NotificationPrefs) => {
    setPrefs(next);
    setSaving(true);
    try {
      await api.put("/users/me/notification-preferences", next);
    } catch {
      toast.error("Could not save preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-farumasi-600" /></div>;
  }

  const channelLabels: { key: keyof NotificationPrefs["channels"]; label: string; desc: string }[] = [
    { key: "push",     label: "Push",     desc: "Browser & mobile notifications" },
    { key: "email",    label: "Email",    desc: "Sent to your account email" },
    { key: "sms",      label: "SMS",      desc: "Text message alerts" },
    { key: "whatsapp", label: "WhatsApp", desc: "Messages via WhatsApp" },
  ];
  const eventLabels: { key: keyof NotificationPrefs["events"]; label: string; desc: string }[] = [
    { key: "orders",      label: "Orders & Requests", desc: "New orders, status changes, prescription requests" },
    { key: "reminders",   label: "Reminders",         desc: "Restock alerts, expiring inventory" },
    { key: "app_updates", label: "App Updates",       desc: "New features and maintenance notices" },
    { key: "health_tips", label: "Health Tips",       desc: "Articles published on the platform" },
    { key: "promotions",  label: "Promotions",        desc: "Marketing and offers from Farumasi" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Channels</p>
        <div className="space-y-3">
          {channelLabels.map((c) => (
            <div key={c.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.label}</p>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
              <Toggle
                value={prefs.channels[c.key]}
                onChange={(v) => persist({ ...prefs, channels: { ...prefs.channels, [c.key]: v } })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Events</p>
        <div className="space-y-3">
          {eventLabels.map((e) => (
            <div key={e.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{e.label}</p>
                <p className="text-xs text-slate-500">{e.desc}</p>
              </div>
              <Toggle
                value={prefs.events[e.key]}
                onChange={(v) => persist({ ...prefs, events: { ...prefs.events, [e.key]: v } })}
              />
            </div>
          ))}
        </div>
      </div>

      {saving && <p className="text-xs text-slate-400">Saving…</p>}
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={cn("w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer", value ? "bg-farumasi-600" : "bg-slate-200")}
      onClick={() => onChange(!value)}
    >
      <div className={cn("w-5 h-5 rounded-full bg-white shadow transition-transform", value ? "translate-x-5" : "translate-x-0")} />
    </div>
  );
}
