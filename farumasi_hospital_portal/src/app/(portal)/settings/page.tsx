"use client";

import { useState } from "react";
import { Building2, User, Bell, Globe } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { mockHospital } from "@/data/mock";

const SECTIONS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "locale", label: "Locale & Display", icon: Globe },
] as const;

type Section = typeof SECTIONS[number]["id"];

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("general");

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageHeader title="Settings" subtitle="Hospital portal configuration and preferences" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Nav */}
        <nav className="flex md:flex-col gap-1 md:w-44 shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors text-left ${active === id ? "bg-farumasi-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {active === "general" && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Hospital Information</h3>
              </div>
              <CardContent className="space-y-4">
                <Input label="Hospital Name" defaultValue={mockHospital.name} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="District" defaultValue={mockHospital.district} />
                  <Input label="Province" defaultValue={mockHospital.province} />
                </div>
                <Input label="Total Beds" type="number" defaultValue={mockHospital.totalBeds} />
                <Input label="Phone" defaultValue={mockHospital.phone} />
                <div className="flex gap-2 pt-2">
                  <Button size="sm">Save Changes</Button>
                  <Button size="sm" variant="outline">Reset</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "profile" && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Admin Profile</h3>
              </div>
              <CardContent className="space-y-4">
                <Input label="Full Name" defaultValue="Alice Mukamusoni" />
                <Input label="Email" defaultValue="alice.mukamusoni@kuth.rw" />
                <Input label="Phone" defaultValue="+250 788 000 001" />
                <Input label="Job Title" defaultValue="Super Hospital Administrator" />
                <div className="flex gap-2 pt-2">
                  <Button size="sm">Save Profile</Button>
                  <Button size="sm" variant="outline">Change Password</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "notifications" && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
              </div>
              <CardContent className="space-y-4">
                {[
                  { label: "Critical Shortages", desc: "Alerts when medicine stock hits critical levels" },
                  { label: "Doctor Status Changes", desc: "When a doctor is activated, restricted or suspended" },
                  { label: "Compliance Alerts", desc: "Failed audits or non-compliance reports" },
                  { label: "Insurance Claim Updates", desc: "When a claim is approved, rejected or paid" },
                  { label: "Fulfillment Failures", desc: "When a prescription fulfillment fails or is cancelled" },
                ].map(({ label, desc }) => (
                  <label key={label} className="flex items-start justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 accent-farumasi-600" />
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm">Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "locale" && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Locale & Display</h3>
              </div>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Currency</label>
                  <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30">
                    <option value="RWF">RWF — Rwandan Franc</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Date Format</label>
                  <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Language</label>
                  <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30">
                    <option>English</option>
                    <option>Kinyarwanda</option>
                    <option>Français</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm">Apply</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
