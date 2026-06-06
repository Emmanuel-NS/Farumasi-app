"use client";

import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge } from "@/components/ui";
import { Settings, Globe, Lock, Bell, Server, Info } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Platform Settings" subtitle="Global configuration for the FARUMASI platform" breadcrumb="System" />

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          MVP read-only view. Platform toggles and live config will connect to an admin settings API in a later
          release. For compliance actions, use{" "}
          <Link href="/audit" className="font-semibold underline text-farumasi-700">
            Audit & Compliance
          </Link>
          .
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-farumasi-600" /><CardTitle>General Configuration</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Platform Name", value: "FARUMASI Super Admin" },
              { label: "Default Currency", value: "RWF (Rwandan Franc)" },
              { label: "Default Timezone", value: "Africa/Kigali (UTC+2)" },
              { label: "Default Language", value: "English (en)" },
              { label: "Support Email", value: "support@farumasi.rw" },
              { label: "Platform Version", value: "2.4.1" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-[12px] text-slate-500">{s.label}</span>
                <span className="text-[12px] font-semibold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-farumasi-600" /><CardTitle>Security Settings</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Session Timeout", value: "30 minutes" },
              { label: "Max Login Attempts", value: "5" },
              { label: "Two-Factor Auth", value: "Planned", badge: "planned" },
              { label: "Password Policy", value: "Min 12 chars, uppercase, symbol" },
              { label: "IP Whitelist", value: "Disabled" },
              { label: "Audit Logging", value: "All actions", badge: "active" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-[12px] text-slate-500">{s.label}</span>
                <div className="flex items-center gap-2">
                  {s.badge && (
                    <Badge variant={s.badge === "active" ? "success" : "neutral"}>
                      {s.badge === "active" ? "Active" : "Planned"}
                    </Badge>
                  )}
                  <span className="text-[12px] font-semibold text-slate-900">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-farumasi-600" /><CardTitle>Notification Channels</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Email Notifications", value: "Enabled", badge: "active" },
              { label: "SMS Alerts", value: "Critical only" },
              { label: "In-App Alerts", value: "All events", badge: "active" },
              { label: "Slack Webhook", value: "Not configured", badge: "planned" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-[12px] text-slate-500">{s.label}</span>
                <div className="flex items-center gap-2">
                  {s.badge && (
                    <Badge variant={s.badge === "active" ? "success" : "neutral"}>
                      {s.badge === "active" ? "Active" : "Planned"}
                    </Badge>
                  )}
                  <span className="text-[12px] font-semibold text-slate-900">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Server className="w-4 h-4 text-farumasi-600" /><CardTitle>Maintenance Mode</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Global Maintenance Mode</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Temporarily disables all public-facing endpoints and shows a maintenance page to end users.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Inactive</Badge>
              <div className="w-10 h-5 bg-slate-200 rounded-full cursor-pointer" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
