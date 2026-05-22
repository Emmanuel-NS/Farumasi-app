"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { Bell, Shield, Store, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [open, setOpen] = useState<string | null>("general");

  const toggle = (id: string) => setOpen((p) => (p === id ? null : id));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your pharmacy and account settings</p>
      </div>

      <div className="space-y-3">
        <Accordion id="general" title="General" icon={Store} open={open} onToggle={toggle}>
          <GeneralSection />
        </Accordion>
        <Accordion id="security" title="Security" icon={Shield} open={open} onToggle={toggle}>
          <SecuritySection />
        </Accordion>
        <Accordion id="notifications" title="Notifications" icon={Bell} open={open} onToggle={toggle}>
          <NotificationsSection />
        </Accordion>
        <Accordion id="compliance" title="Compliance" icon={CheckCircle} open={open} onToggle={toggle}>
          <ComplianceSection />
        </Accordion>
      </div>
    </div>
  );
}

function Accordion({ id, title, icon: Icon, open, onToggle, children }: {
  id: string; title: string; icon: any; open: string | null; onToggle: (id: string) => void; children: React.ReactNode
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

function GeneralSection() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({
    pharmacyName: "FARUMASI Pharmacy",
    address: "Kigali, Rwanda",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
  });
  const u = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inp = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all";
  return (
    <div className="space-y-4">
      {([["Pharmacy Name", "pharmacyName"], ["Address", "address"], ["Phone", "phone"], ["Email", "email"]] as const).map(([label, key]) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
          <input value={form[key]} onChange={(e) => u(key, e.target.value)} className={inp} />
        </div>
      ))}
      <button onClick={() => toast.success("Pharmacy info saved")} className="mt-2 px-5 py-2 bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold rounded-xl transition-colors">
        Save Changes
      </button>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-3">
      {[
        { label: "Change Password", desc: "Update your account password" },
        { label: "Two-Factor Authentication", desc: "Add a second layer of security" },
        { label: "Active Sessions", desc: "View and revoke active logins" },
      ].map((item) => (
        <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </div>
          <button className="text-xs text-farumasi-600 font-semibold hover:underline">Manage</button>
        </div>
      ))}
    </div>
  );
}

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

function NotificationsSection() {
  const [toggles, setToggles] = useState({
    new_requests: true, order_updates: true, low_stock: true, chat_messages: true, system: false
  });
  const set = (k: keyof typeof toggles, v: boolean) => setToggles((p) => ({ ...p, [k]: v }));
  const items: { key: keyof typeof toggles; label: string; desc: string }[] = [
    { key: "new_requests", label: "New Prescription Requests", desc: "Notify when a broadcast arrives" },
    { key: "order_updates", label: "Order Updates", desc: "Confirmations, delivery events" },
    { key: "low_stock", label: "Low Stock Alerts", desc: "When items fall below minimum" },
    { key: "chat_messages", label: "Patient Messages", desc: "Incoming chat from patients" },
    { key: "system", label: "System & Maintenance", desc: "Platform updates and notices" },
  ];
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.key} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{i.label}</p>
            <p className="text-xs text-slate-500">{i.desc}</p>
          </div>
          <Toggle value={toggles[i.key]} onChange={(v) => set(i.key, v)} />
        </div>
      ))}
    </div>
  );
}

function ComplianceSection() {
  return (
    <div className="space-y-3">
      {[
        { label: "Pharmacy License", value: "RPB/LIC/2024/001234", desc: "Valid through Dec 2025" },
        { label: "Operating Hours", value: "Mon–Sat 08:00–20:00 / Sun 09:00–16:00", desc: "EAT (UTC+3)" },
        { label: "Registration Number", value: "RDB/REG/2020/009876", desc: "Business registration" },
      ].map((item) => (
        <div key={item.label} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{item.value}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
            <button className="text-xs text-farumasi-600 font-semibold hover:underline shrink-0">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}
