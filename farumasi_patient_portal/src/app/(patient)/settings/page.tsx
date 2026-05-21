"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguageStore, type LangCode } from "@/store/language-store";
import { useTranslation, type T } from "@/lib/translations";
import {
  Bell, Shield, Eye, Globe, ChevronDown, ChevronUp,
  Smartphone, Mail, MessageSquare, Phone,
  Lock, FileText, HelpCircle, Info, Check,
} from "lucide-react";

type Section = "notifications" | "security" | "transparency" | "preferences";

const LANG_OPTIONS: { code: LangCode; label: string; native: string }[] = [
  { code: "en", label: "English",     native: "English"     },
  { code: "rw", label: "Kinyarwanda", native: "Kinyarwanda" },
  { code: "fr", label: "Français",    native: "Français"    },
  { code: "sw", label: "Swahili",     native: "Swahili"     },
];

export default function SettingsPage() {
  const { lang, setLang } = useLanguageStore();
  const t = useTranslation();

  const [open, setOpen] = useState<Section | null>("notifications");
  const [channels, setChannels] = useState({ push: true, email: true, sms: false, whatsapp: false });
  const [events, setEvents] = useState({ orders: true, health_tips: true, promotions: false, app_updates: true, reminders: true });
  const [theme, setTheme] = useState("light");

  const toggle = (section: Section) => setOpen((o) => o === section ? null : section);

  const notifChannels = [
    { key: "push",      label: t.settings_push,      icon: Smartphone },
    { key: "email",     label: t.settings_email,     icon: Mail        },
    { key: "sms",       label: t.settings_sms,       icon: MessageSquare },
    { key: "whatsapp",  label: t.settings_whatsapp,  icon: Phone       },
  ];

  const notifEvents = [
    { key: "orders",       label: t.settings_order_updates },
    { key: "health_tips",  label: t.settings_health_tips   },
    { key: "promotions",   label: t.settings_promotions    },
    { key: "app_updates",  label: t.settings_app_updates   },
    { key: "reminders",    label: t.settings_reminders     },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.settings_title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.settings_subtitle}</p>
      </div>

      <div className="space-y-3">
        {/* Notifications */}
        <AccordionSection
          open={open === "notifications"}
          onToggle={() => toggle("notifications")}
          icon={Bell}
          title={t.settings_notif}
          subtitle={t.settings_notif_sub}
        >
          <div className="pt-4 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.settings_channels}</p>
              <div className="space-y-3">
                {notifChannels.map(({ key, label, icon: Icon }) => (
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.settings_notif_types}</p>
              <div className="space-y-3">
                {notifEvents.map(({ key, label }) => (
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
          title={t.settings_security}
          subtitle={t.settings_security_sub}
        >
          <div className="pt-4 space-y-2">
            <SettingsLink icon={Lock}        label={t.settings_change_password} />
            <SettingsLink icon={Shield}      label={t.settings_2fa}             badge="Disabled" badgeColor="text-red-500" />
            <SettingsLink icon={FileText}    label={t.settings_data_privacy} />
            <SettingsLink icon={Eye}         label={t.settings_active_sessions} />
          </div>
        </AccordionSection>

        {/* Transparency & Control */}
        <AccordionSection
          open={open === "transparency"}
          onToggle={() => toggle("transparency")}
          icon={Eye}
          title={t.settings_transparency}
          subtitle={t.settings_transparency_sub}
        >
          <div className="pt-4 space-y-2">
            <SettingsLink icon={Smartphone}  label={t.settings_app_permissions} />
            <SettingsLink icon={FileText}    label={t.settings_terms} />
            <SettingsLink icon={Shield}      label={t.settings_privacy_policy} />
            <SettingsLink icon={HelpCircle}  label={t.settings_help_support}  href="/help" />
            <SettingsLink icon={Info}        label={t.settings_about} />
          </div>
        </AccordionSection>

        {/* Preferences */}
        <AccordionSection
          open={open === "preferences"}
          onToggle={() => toggle("preferences")}
          icon={Globe}
          title={t.settings_preferences}
          subtitle={t.settings_preferences_sub}
        >
          <div className="pt-4 space-y-5">
            {/* Language selector — card grid */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.settings_language}</p>
              <div className="grid grid-cols-2 gap-2">
                {LANG_OPTIONS.map(({ code, native }) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
                      lang === code
                        ? "border-farumasi-600 bg-farumasi-50 text-farumasi-700 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-farumasi-300 hover:bg-slate-50"
                    )}
                  >
                    <span>{native}</span>
                    {lang === code && <Check className="w-4 h-4 text-farumasi-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme selector */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.settings_theme}</p>
              <div className="flex gap-3">
                {(["light", "dark", "system"] as const).map((themeOpt) => (
                  <button
                    key={themeOpt}
                    onClick={() => setTheme(themeOpt)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-sm font-semibold transition-all",
                      theme === themeOpt
                        ? "border-farumasi-600 bg-farumasi-50 text-farumasi-700"
                        : "border-slate-200 text-slate-500 hover:border-farumasi-300"
                    )}
                  >
                    {themeOpt === "light" ? t.theme_light : themeOpt === "dark" ? t.theme_dark : t.theme_system}
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
