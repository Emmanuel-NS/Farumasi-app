"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge } from "@/components/ui";
import { Settings, Globe, Lock, Bell, Server, Info, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { authService, getApiError } from "@/lib/services/auth.service";

function toast(msg: string, type: "success" | "error" = "success") {
  // simple banner via alert fallback — replace with a real toast if available
  if (type === "error") console.error(msg);
  else console.info(msg);
}

function ChangePasswordSection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handle = async () => {
    if (!form.current || !form.next || !form.confirm) { setMsg({ text: "Fill all fields.", error: true }); return; }
    if (form.next.length < 8) { setMsg({ text: "New password must be at least 8 characters.", error: true }); return; }
    if (form.next !== form.confirm) { setMsg({ text: "Passwords don't match.", error: true }); return; }
    setSaving(true); setMsg(null);
    try {
      await authService.changePassword(form.current, form.next);
      setMsg({ text: "Password changed successfully.", error: false });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMsg({ text: getApiError(err, "Failed to change password"), error: true });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 ${msg.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg.text}
        </p>
      )}
      <div className="relative">
        <input
          type={show.current ? "text" : "password"}
          placeholder="Current password"
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-farumasi-500"
        />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShow(s => ({ ...s, current: !s.current }))}>
          {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <div className="relative">
        <input
          type={show.next ? "text" : "password"}
          placeholder="New password (min 8 chars)"
          value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-farumasi-500"
        />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShow(s => ({ ...s, next: !s.next }))}>
          {show.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <input
        type="password"
        placeholder="Confirm new password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-farumasi-500"
      />
      <button
        onClick={handle}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-farumasi-600 text-white text-sm font-medium hover:bg-farumasi-700 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Update Password
      </button>
    </div>
  );
}

function TwoFactorSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"idle" | "enable" | "disable">("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    authService.getTwoFactorStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  const sendEnableCode = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await authService.sendTwoFactorSetupCode();
      setStep("enable");
      setCode("");
      setMsg({ text: "Verification code sent to your email.", error: false });
    } catch (err) {
      setMsg({ text: getApiError(err, "Could not send code"), error: true });
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (code.trim().length < 4) {
      setMsg({ text: "Enter the verification code.", error: true });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const s = await authService.enableTwoFactor(code);
      setEnabled(s.enabled);
      setStep("idle");
      setCode("");
      setMsg({ text: "Two-factor authentication enabled.", error: false });
    } catch (err) {
      setMsg({ text: getApiError(err, "Could not enable 2FA"), error: true });
    } finally {
      setLoading(false);
    }
  };

  const sendDisableCode = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await authService.sendTwoFactorDisableCode();
      setStep("disable");
      setCode("");
      setPassword("");
      setMsg({ text: "Verification code sent to your email.", error: false });
    } catch (err) {
      setMsg({ text: getApiError(err, "Could not send code"), error: true });
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (!password || code.trim().length < 4) {
      setMsg({ text: "Enter your password and verification code.", error: true });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const s = await authService.disableTwoFactor(password, code);
      setEnabled(s.enabled);
      setStep("idle");
      setCode("");
      setPassword("");
      setMsg({ text: "Two-factor authentication disabled.", error: false });
    } catch (err) {
      setMsg({ text: getApiError(err, "Could not disable 2FA"), error: true });
    } finally {
      setLoading(false);
    }
  };

  if (enabled === null) {
    return <p className="text-xs text-slate-500">Loading security settings…</p>;
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-farumasi-600" /> Two-Factor Authentication
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Require an email verification code when signing in to this admin portal.
          </p>
        </div>
        <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
      </div>

      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 ${msg.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg.text}
        </p>
      )}

      {step === "idle" && (
        <div className="flex flex-wrap gap-2">
          {!enabled ? (
            <button
              type="button"
              onClick={sendEnableCode}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-farumasi-600 text-white text-sm font-medium hover:bg-farumasi-700 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Enable 2FA"}
            </button>
          ) : (
            <button
              type="button"
              onClick={sendDisableCode}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Disable 2FA"}
            </button>
          )}
        </div>
      )}

      {step === "enable" && (
        <div className="space-y-2 max-w-sm">
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code from email"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-widest outline-none focus:ring-1 focus:ring-farumasi-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmEnable}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-farumasi-600 text-white text-sm font-medium hover:bg-farumasi-700 disabled:opacity-60"
            >
              Confirm enable
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setCode(""); setMsg(null); }}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "disable" && (
        <div className="space-y-2 max-w-sm">
          <input
            type="password"
            placeholder="Current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-farumasi-500"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code from email"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-widest outline-none focus:ring-1 focus:ring-farumasi-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmDisable}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
            >
              Confirm disable
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setCode(""); setPassword(""); setMsg(null); }}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Session Timeout", value: "30 minutes" },
              { label: "Max Login Attempts", value: "5" },
              { label: "Password Policy", value: "Min 8 chars" },
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
          <div className="border-t pt-4">
            <TwoFactorSection />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-farumasi-600" /> Change Admin Password
            </p>
            <ChangePasswordSection />
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
