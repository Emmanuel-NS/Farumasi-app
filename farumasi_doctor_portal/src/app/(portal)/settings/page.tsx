"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Settings, Bell, Shield, CreditCard, User,
  Moon, Globe, ChevronDown, ChevronUp, Save, Check,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const SECTION_IDS = ["general", "notifications", "security", "preferences"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTIONS = [
  { id: "general" as SectionId, label: "General", icon: User, description: "Language, timezone, and display" },
  { id: "notifications" as SectionId, label: "Notifications", icon: Bell, description: "Alerts, emails, and push settings" },
  { id: "security" as SectionId, label: "Security", icon: Shield, description: "Password, 2FA, and session management" },
  { id: "preferences" as SectionId, label: "Preferences", icon: Settings, description: "Clinical workflow preferences" },
];

export default function SettingsPage() {
  const [openSection, setOpenSection] = useState<SectionId>("general");

  const toggle = (id: SectionId) => setOpenSection((prev) => (prev === id ? "general" : id));

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and clinical preferences"
        icon={<Settings className="w-5 h-5" />}
      />

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center">
                  <section.icon className="w-4 h-4 text-farumasi-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{section.label}</p>
                  <p className="text-xs text-slate-400">{section.description}</p>
                </div>
              </div>
              {openSection === section.id
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </button>

            {openSection === section.id && (
              <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                {section.id === "general" && <GeneralSettings />}
                {section.id === "notifications" && <NotificationSettings />}
                {section.id === "security" && <SecuritySettings />}
                {section.id === "preferences" && <ClinicalPreferences />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneralSettings() {
  const [lang, setLang] = useState("English");
  const [tz, setTz] = useState("Africa/Kigali");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">Language</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        >
          <option>English</option>
          <option>Français</option>
          <option>Kinyarwanda</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">Timezone</label>
        <select
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        >
          <option value="Africa/Kigali">Africa/Kigali (UTC+2)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>
      <SaveButton onSave={() => toast.success("General settings saved")} />
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    prescriptionAlerts: true,
    fulfillmentUpdates: true,
    stockAlerts: true,
    patientAlerts: true,
    emailSummary: false,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {[
        { key: "prescriptionAlerts" as const, label: "Prescription alerts", sub: "Notify when prescription status changes" },
        { key: "fulfillmentUpdates" as const, label: "Fulfillment updates", sub: "Notify when pharmacy dispenses" },
        { key: "stockAlerts" as const, label: "Stock alerts", sub: "Notify when medicines go out of stock" },
        { key: "patientAlerts" as const, label: "Patient alerts", sub: "Critical patient status notifications" },
        { key: "emailSummary" as const, label: "Daily email summary", sub: "Receive a daily clinical summary" },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-slate-800">{item.label}</p>
            <p className="text-xs text-slate-400">{item.sub}</p>
          </div>
          <button
            onClick={() => toggle(item.key)}
            className={`w-11 h-6 rounded-full transition-colors relative ${settings[item.key] ? "bg-farumasi-600" : "bg-slate-200"}`}
          >
            <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${settings[item.key] ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      ))}
      <SaveButton onSave={() => toast.success("Notification settings saved")} />
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-lg space-y-2">
        <p className="text-sm font-medium text-slate-700">Change Password</p>
        <input type="password" placeholder="Current password" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500" />
        <input type="password" placeholder="New password" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500" />
        <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500" />
        <button
          onClick={() => toast.success("Password changed successfully")}
          className="text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
        >
          Update Password
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Two-Factor Authentication</p>
          <p className="text-xs text-slate-400">Add extra security to your account</p>
        </div>
        <button
          onClick={() => toast.info("2FA setup coming soon")}
          className="text-sm text-farumasi-600 font-medium hover:underline"
        >
          Enable
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
        <p className="text-sm font-medium text-amber-800 mb-1">Active Sessions</p>
        <p className="text-xs text-amber-700">Kigali, Rwanda · Chrome · 2 hours ago</p>
        <button
          onClick={() => toast.success("All other sessions revoked")}
          className="text-xs text-red-600 font-medium mt-2 hover:underline"
        >
          Revoke all other sessions
        </button>
      </div>
    </div>
  );
}

function ClinicalPreferences() {
  const [prefs, setPrefs] = useState({
    defaultDuration: "7 days",
    autoFillFreq: true,
    showIntelPanel: true,
    requireDoubleConfirm: true,
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">Default prescription duration</label>
        <select
          value={prefs.defaultDuration}
          onChange={(e) => setPrefs({ ...prefs, defaultDuration: e.target.value })}
          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        >
          <option>3 days</option>
          <option>5 days</option>
          <option>7 days</option>
          <option>14 days</option>
          <option>30 days</option>
        </select>
      </div>
      {[
        { key: "autoFillFreq" as const, label: "Auto-fill common frequencies" },
        { key: "showIntelPanel" as const, label: "Always show intelligence panel" },
        { key: "requireDoubleConfirm" as const, label: "Require confirmation before submitting Rx" },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between">
          <p className="text-sm text-slate-700">{item.label}</p>
          <button
            onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
            className={`w-11 h-6 rounded-full transition-colors relative ${prefs[item.key] ? "bg-farumasi-600" : "bg-slate-200"}`}
          >
            <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${prefs[item.key] ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      ))}
      <SaveButton onSave={() => toast.success("Clinical preferences saved")} />
    </div>
  );
}

function SaveButton({ onSave }: { onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      className="flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
    >
      <Save className="w-4 h-4" />
      Save Changes
    </button>
  );
}
