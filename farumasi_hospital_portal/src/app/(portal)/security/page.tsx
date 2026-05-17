"use client";

import { useState } from "react";
import { Shield, Lock, Eye, AlertTriangle, CheckCircle2, Monitor } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

const SESSIONS = [
  { id: "s1", device: "Chrome / Windows 11", ip: "196.12.44.10", location: "Kigali, RW", lastActive: "2024-05-16T09:10:00Z", current: true },
  { id: "s2", device: "Firefox / Ubuntu", ip: "196.12.44.11", location: "Kigali, RW", lastActive: "2024-05-15T16:30:00Z", current: false },
];

const ALERTS = [
  { id: "a1", title: "New login from unrecognized device", detail: "Firefox / Ubuntu · 196.12.44.11 · 15 May 2024", severity: "Warning" },
  { id: "a2", title: "3 failed login attempts", detail: "User: jean.claude@kuth.rw · 14 May 2024 · 22:40", severity: "Warning" },
  { id: "a3", title: "Permission escalation by admin", detail: "Alice Mukamusoni granted doctor:write to role Pharmacist", severity: "Info" },
  { id: "a4", title: "Audit export performed", detail: "Alice Mukamusoni exported audit logs · 13 May 2024", severity: "Info" },
];

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("60");

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageHeader title="Security & Access Control" subtitle="Manage session security, MFA, and threat monitoring" />

      {/* Security status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "MFA Enabled", value: mfaEnabled ? "Active" : "Inactive", ok: mfaEnabled },
          { label: "Active Sessions", value: `${SESSIONS.length} devices`, ok: true },
          { label: "Open Alerts", value: `${ALERTS.filter((a) => a.severity === "Warning").length} warnings`, ok: false },
        ].map(({ label, value, ok }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
            {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            <div>
              <p className="text-xs text-slate-600">{label}</p>
              <p className={`font-bold text-sm ${ok ? "text-emerald-800" : "text-amber-800"}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MFA */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-farumasi-600" />Multi-Factor Authentication</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">Require MFA for all admin logins</p>
            <p className="text-xs text-slate-500 mt-0.5">Applies to all accounts with administrator or doctor roles</p>
          </div>
          <button
            onClick={() => setMfaEnabled((v) => !v)}
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${mfaEnabled ? "bg-farumasi-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${mfaEnabled ? "translate-x-5" : ""}`} />
          </button>
        </CardContent>
      </Card>

      {/* Session timeout */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-farumasi-600" />Session Timeout</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <p className="text-sm text-slate-700 flex-1">Auto-logout after inactivity</p>
          <select
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="120">2 hours</option>
          </select>
          <Button size="sm">Save</Button>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="w-4 h-4 text-farumasi-600" />Active Sessions</CardTitle></CardHeader>
        <div className="divide-y divide-slate-50">
          {SESSIONS.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{s.device}</p>
                  {s.current && <Badge variant="success">Current</Badge>}
                </div>
                <p className="text-xs text-slate-500">{s.ip} · {s.location} · Last: {formatDateTime(s.lastActive)}</p>
              </div>
              {!s.current && (
                <Button size="sm" variant="ghost" className="text-red-600 shrink-0">Revoke</Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Security alerts */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Security Alerts</CardTitle></CardHeader>
        <div className="divide-y divide-slate-50">
          {ALERTS.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-5 py-4">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === "Warning" ? "bg-amber-500" : "bg-slate-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
              </div>
              <Badge variant={a.severity === "Warning" ? "warning" : "default"} className="shrink-0">{a.severity}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
