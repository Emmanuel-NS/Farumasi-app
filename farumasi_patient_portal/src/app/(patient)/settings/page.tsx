"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bell, Shield, Eye, Globe, ChevronDown, ChevronUp,
  Smartphone, Mail, MessageSquare, Phone,
  Lock, FileText, HelpCircle, Info,
} from "lucide-react";

type Section = "notifications" | "security" | "transparency" | "preferences";

const NOTIF_CHANNELS = [
  { key: "push", label: "Push Notifications", icon: Smartphone },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: Phone },
];

const NOTIF_EVENTS = [
  { key: "orders", label: "Order updates" },
  { key: "health_tips", label: "Health tips & articles" },
  { key: "promotions", label: "Promotions & offers" },
  { key: "app_updates", label: "App announcements" },
  { key: "reminders", label: "Medication reminders" },
];

export default function SettingsPage() {
  const [open, setOpen] = useState<Section | null>("notifications");
  const [channels, setChannels] = useState({ push: true, email: true, sms: false, whatsapp: false });
  const [events, setEvents] = useState({ orders: true, health_tips: true, promotions: false, app_updates: true, reminders: true });
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("light");

  const toggle = (section: Section) => setOpen((o) => o === section ? null : section);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account preferences</p>
      </div>

      <div className="space-y-3">
        {/* Notifications */}
        <AccordionSection
          open={open === "notifications"}
          onToggle={() => toggle("notifications")}
          icon={Bell}
          title="Notifications"
          subtitle="Manage how you receive alerts"
        >
          <div className="pt-4 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Channels</p>
              <div className="space-y-3">
                {NOTIF_CHANNELS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </div>
                    <Toggle
                      checked={channels[key as keyof typeof channels]}
                      onChange={(v) => setChannels((c) => ({ ...c, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notification Types</p>
              <div className="space-y-3">
                {NOTIF_EVENTS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{label}</span>
                    <Toggle
                      checked={events[key as keyof typeof events]}
                      onChange={(v) => setEvents((e) => ({ ...e, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* Security */}
        <AccordionSection
          open={open === "security"}
          onToggle={() => toggle("security")}
          icon={Shield}
          title="Security"
          subtitle="Password, access & data protection"
        >
          <div className="pt-4 space-y-2">
            <SettingsLink icon={Lock} label="Change Password" />
            <SettingsLink icon={Shield} label="Two-Factor Authentication" badge="Disabled" badgeColor="text-red-500" />
            <SettingsLink icon={FileText} label="Data Privacy & GDPR" />
            <SettingsLink icon={Eye} label="Active Sessions" />
          </div>
        </AccordionSection>

        {/* Transparency & Control */}
        <AccordionSection
          open={open === "transparency"}
          onToggle={() => toggle("transparency")}
          icon={Eye}
          title="Transparency & Control"
          subtitle="Permissions, terms, and data use"
        >
          <div className="pt-4 space-y-2">
            <SettingsLink icon={Smartphone} label="App Permissions" />
            <SettingsLink icon={FileText} label="Terms of Service" />
            <SettingsLink icon={Shield} label="Privacy Policy" />
            <SettingsLink icon={HelpCircle} label="Help & Support" href="/help" />
            <SettingsLink icon={Info} label="About FARUMASI" />
          </div>
        </AccordionSection>

        {/* Preferences */}
        <AccordionSection
          open={open === "preferences"}
          onToggle={() => toggle("preferences")}
          icon={Globe}
          title="Preferences"
          subtitle="Language and display settings"
        >
          <div className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
                <option value="fr">Français</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Theme</label>
              <div className="flex gap-3">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-sm font-semibold capitalize transition-all",
                      theme === t ? "border-farumasi-600 bg-farumasi-50 text-farumasi-700" : "border-slate-200 text-slate-500 hover:border-farumasi-300"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

function AccordionSection({ open, onToggle, icon: Icon, title, subtitle, children }: {
  open: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-farumasi-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-50">
          {children}
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-10 h-6 rounded-full relative transition-colors shrink-0",
        checked ? "bg-farumasi-600" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}

function SettingsLink({ icon: Icon, label, badge, badgeColor, href }: {
  icon: React.ElementType;
  label: string;
  badge?: string;
  badgeColor?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
      <Icon className="w-4 h-4 text-slate-500 group-hover:text-farumasi-600" />
      <span className="text-sm text-slate-700 flex-1">{label}</span>
      {badge && <span className={cn("text-xs font-semibold", badgeColor ?? "text-slate-400")}>{badge}</span>}
      <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
    </div>
  );
  if (href) return <a href={href}>{inner}</a>;
  return <div>{inner}</div>;
}
