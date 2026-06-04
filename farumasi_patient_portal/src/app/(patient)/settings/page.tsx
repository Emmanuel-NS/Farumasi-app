"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguageStore, type LangCode } from "@/store/language-store";
import { useTranslation } from "@/lib/translations";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/lib/services/auth.service";
import {
  settingsService,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/services/settings.service";
import {
  Bell, Shield, Globe, ChevronDown, ChevronUp,
  Smartphone, Mail, MessageSquare, Phone,
  Lock, FileText, HelpCircle, Info, Check, Loader2,
  Download, LogOut, Trash2, AlertTriangle, X, ShieldCheck, CheckCircle2, KeyRound,
} from "lucide-react";
import { usePinStore } from "@/store/pin-store";

type Section = "notifications" | "security" | "data" | "preferences" | "about";

const LANG_OPTIONS: { code: LangCode; native: string }[] = [
  { code: "en", native: "English"     },
  { code: "rw", native: "Kinyarwanda" },
  { code: "fr", native: "FranÃ§ais"    },
  { code: "sw", native: "Swahili"     },
];

const LS_PREFS_KEY = "farumasi_patient_prefs";

function loadGuestPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(LS_PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      channels: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels, ...(parsed.channels ?? {}) },
      events:   { ...DEFAULT_NOTIFICATION_PREFERENCES.events,   ...(parsed.events   ?? {}) },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export default function SettingsPage() {
  const { lang, setLang } = useLanguageStore();
  const t = useTranslation();
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState<Section | null>("notifications");
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPwd, setShowPwd] = useState(false);
  const [showSignOutAll, setShowSignOutAll] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setPrefs(loadGuestPrefs());
      return;
    }
    let cancelled = false;
    setPrefsLoading(true);
    settingsService
      .getNotificationPreferences()
      .then((p) => { if (!cancelled) setPrefs(p); })
      .catch(() => { if (!cancelled) setPrefs(loadGuestPrefs()); })
      .finally(() => { if (!cancelled) setPrefsLoading(false); });
    return () => { cancelled = true; };
  }, [isGuest]);

  const schedulePrefsSave = useCallback((next: NotificationPreferences) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (isGuest) {
        try { localStorage.setItem(LS_PREFS_KEY, JSON.stringify(next)); } catch {}
        toast.success("Saved");
        return;
      }
      setSavingPrefs(true);
      try {
        await settingsService.updateNotificationPreferences(next);
        toast.success("Notification preferences saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save preferences");
      } finally {
        setSavingPrefs(false);
      }
    }, 450);
  }, [isGuest]);

  const setChannel = (key: keyof NotificationPreferences["channels"], v: boolean) => {
    setPrefs((p) => {
      const next = { ...p, channels: { ...p.channels, [key]: v } };
      schedulePrefsSave(next);
      return next;
    });
  };
  const setEvent = (key: keyof NotificationPreferences["events"], v: boolean) => {
    setPrefs((p) => {
      const next = { ...p, events: { ...p.events, [key]: v } };
      schedulePrefsSave(next);
      return next;
    });
  };
  const resetPrefs = () => {
    setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
    schedulePrefsSave(DEFAULT_NOTIFICATION_PREFERENCES);
  };

  const toggle = (s: Section) => setOpen((o) => o === s ? null : s);

  const notifChannels = [
    { key: "push" as const,     label: t.settings_push,     icon: Smartphone },
    { key: "email" as const,    label: t.settings_email,    icon: Mail },
    { key: "sms" as const,      label: t.settings_sms,      icon: MessageSquare },
    { key: "whatsapp" as const, label: t.settings_whatsapp, icon: Phone },
  ];
  const notifEvents = [
    { key: "orders" as const,      label: t.settings_order_updates },
    { key: "health_tips" as const, label: t.settings_health_tips },
    { key: "promotions" as const,  label: t.settings_promotions },
    { key: "app_updates" as const, label: t.settings_app_updates },
    { key: "reminders" as const,   label: t.settings_reminders },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.settings_title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.settings_subtitle}</p>
      </div>

      <div className="space-y-3">
        <AccordionSection
          open={open === "notifications"}
          onToggle={() => toggle("notifications")}
          icon={Bell}
          title={t.settings_notif}
          subtitle={t.settings_notif_sub}
          rightAccessory={savingPrefs ? <Loader2 className="w-3.5 h-3.5 animate-spin text-farumasi-600" /> : null}
        >
          {prefsLoading ? (
            <div className="pt-6 pb-4 flex items-center justify-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loadingâ€¦
            </div>
          ) : (
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
                      <Toggle checked={prefs.channels[key]} onChange={(v) => setChannel(key, v)} />
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
                      <Toggle checked={prefs.events[key]} onChange={(v) => setEvent(key, v)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button onClick={resetPrefs} className="text-xs font-semibold text-farumasi-600 hover:text-farumasi-700">
                  Reset to defaults
                </button>
              </div>
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          open={open === "security"}
          onToggle={() => toggle("security")}
          icon={Shield}
          title={t.settings_security}
          subtitle={t.settings_security_sub}
        >
          <div className="pt-4 space-y-2">
            <PinManager />
            {isGuest ? (
              <GuestRow message="Sign in to manage your password and active sessions." />
            ) : (
              <>
                <ActionRow icon={Lock} label={t.settings_change_password} onClick={() => setShowPwd(true)} />
                <ActionRow
                  icon={ShieldCheck}
                  label={t.settings_2fa}
                  rightSlot={
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      user?.twoFactorEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                    )}>
                      {user?.twoFactorEnabled ? "Enabled" : "Coming soon"}
                    </span>
                  }
                  disabled
                />
                <ActionRow icon={LogOut} label="Sign out of all other devices" onClick={() => setShowSignOutAll(true)} />
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          open={open === "data"}
          onToggle={() => toggle("data")}
          icon={FileText}
          title="Data & Privacy"
          subtitle="Export your data or delete your account"
        >
          <div className="pt-4 space-y-2">
            {isGuest ? (
              <GuestRow message="Sign in to export or delete your data." />
            ) : (
              <>
                <ActionRow
                  icon={Download}
                  label="Request a copy of my data"
                  description="We'll email a downloadable archive to your registered address."
                  onClick={async () => {
                    try {
                      const res = await authService.requestDataExport();
                      toast.success(res.message);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not request export");
                    }
                  }}
                />
                <ActionRow
                  icon={Trash2}
                  label="Delete my account"
                  description="Permanently deactivate your Farumasi account."
                  destructive
                  onClick={() => setShowDelete(true)}
                />
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          open={open === "preferences"}
          onToggle={() => toggle("preferences")}
          icon={Globe}
          title={t.settings_preferences}
          subtitle={t.settings_preferences_sub}
        >
          <div className="pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.settings_language}</p>
            <div className="grid grid-cols-2 gap-2">
              {LANG_OPTIONS.map(({ code, native }) => (
                <button
                  key={code}
                  onClick={() => {
                    setLang(code);
                    toast.success("Language updated");
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
                    lang === code
                      ? "border-farumasi-600 bg-farumasi-50 text-farumasi-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:border-farumasi-300 hover:bg-slate-50",
                  )}
                >
                  <span>{native}</span>
                  {lang === code && <Check className="w-4 h-4 text-farumasi-600" />}
                </button>
              ))}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          open={open === "about"}
          onToggle={() => toggle("about")}
          icon={Info}
          title="About & Legal"
          subtitle="Help, terms and privacy"
        >
          <div className="pt-4 space-y-2">
            <LinkRow icon={HelpCircle} label={t.settings_help_support} href="/help" />
            <LinkRow icon={FileText}   label={t.settings_terms}        href="/legal/terms" />
            <LinkRow icon={Shield}     label={t.settings_privacy_policy} href="/legal/privacy" />
            <LinkRow icon={Info}       label={t.settings_about}        href="/legal/about" />
          </div>
        </AccordionSection>

        {!isGuest && user && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mt-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Signed in as {user.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                <button
                  onClick={() => {
                    logout();
                    toast.success("Signed out");
                  }}
                  className="mt-3 text-xs font-semibold text-farumasi-600 hover:text-farumasi-700"
                >
                  Sign out of this device
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
      {showSignOutAll && (
        <ConfirmModal
          title="Sign out of all other devices?"
          message="You will remain signed in here. All other browsers and devices will need to sign in again."
          confirmLabel="Sign out everywhere"
          onConfirm={async () => {
            try {
              await authService.logoutEverywhere();
              toast.success("All other sessions have been signed out.");
              setShowSignOutAll(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not complete request");
            }
          }}
          onClose={() => setShowSignOutAll(false)}
        />
      )}
      {showDelete && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            logout();
            toast.success("Account deactivated.");
            if (typeof window !== "undefined") window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}

// â”€â”€ Subcomponents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AccordionSection({
  open, onToggle, icon: Icon, title, subtitle, children, rightAccessory,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  rightAccessory?: React.ReactNode;
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
        {rightAccessory}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-50">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-10 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-farumasi-600" : "bg-slate-200",
      )}
    >
      <span className={cn(
        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-0",
      )} />
    </button>
  );
}

function ActionRow({
  icon: Icon, label, description, onClick, rightSlot, disabled, destructive,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-3 py-2.5 px-3 rounded-2xl text-left transition-colors group",
        disabled ? "cursor-default opacity-70" : "hover:bg-slate-50 cursor-pointer",
      )}
    >
      <Icon className={cn(
        "w-4 h-4 mt-0.5 shrink-0",
        destructive ? "text-rose-500" : "text-slate-500 group-hover:text-farumasi-600",
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", destructive ? "text-rose-600 font-semibold" : "text-slate-700")}>{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {rightSlot ?? (!disabled && <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />)}
    </button>
  );
}

function LinkRow({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2.5 px-3 rounded-2xl hover:bg-slate-50 transition-colors group"
    >
      <Icon className="w-4 h-4 text-slate-500 group-hover:text-farumasi-600" />
      <span className="text-sm text-slate-700 flex-1">{label}</span>
      <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
    </Link>
  );
}

function GuestRow({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <p className="text-xs text-slate-500 mb-2">{message}</p>
      <Link href="/auth/login" className="inline-block text-xs font-semibold text-farumasi-600 hover:text-farumasi-700">
        Sign in â†’
      </Link>
    </div>
  );
}

// â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, onConfirm, onClose, destructive,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  destructive?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
          Cancel
        </button>
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try { await onConfirm(); } finally { setLoading(false); }
          }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60",
            destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-farumasi-600 hover:bg-farumasi-700",
          )}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function passwordStrength(pwd: string): { score: 0|1|2|3|4; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: "bg-rose-500" },
    1: { label: "Weak",      color: "bg-rose-500" },
    2: { label: "Fair",      color: "bg-amber-500" },
    3: { label: "Good",      color: "bg-lime-500" },
    4: { label: "Strong",    color: "bg-emerald-600" },
  };
  return { score: score as 0|1|2|3|4, ...map[score] };
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(next);
  const canSubmit =
    current.length >= 1 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current &&
    !loading;

  const submit = async () => {
    setLoading(true);
    try {
      await authService.changePassword(current, next);
      toast.success("Password updated. Sign in again on your other devices.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Change password" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Current password" type="password" value={current} onChange={setCurrent} />
        <div>
          <Field label="New password" type="password" value={next} onChange={setNext} />
          {next.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 h-1.5">
                {[0,1,2,3].map((i) => (
                  <div key={i} className={cn(
                    "flex-1 rounded-full",
                    i < strength.score ? strength.color : "bg-slate-100",
                  )} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Strength: <span className="font-semibold">{strength.label}</span></p>
            </div>
          )}
        </div>
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
        {confirm.length > 0 && confirm !== next && (
          <p className="text-xs text-rose-500">Passwords don&apos;t match.</p>
        )}
        {next.length > 0 && next === current && (
          <p className="text-xs text-rose-500">New password must differ from current.</p>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Update password
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = password.length >= 1 && confirmText.trim().toUpperCase() === "DELETE" && !loading;

  const submit = async () => {
    setLoading(true);
    try {
      await authService.deleteAccount(password, reason || undefined);
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Delete account" onClose={onClose}>
      <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-100 mb-4">
        <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
        <p className="text-xs text-rose-700">
          This deactivates your account immediately. Your orders and prescription history are retained for legal/audit purposes but become inaccessible to you.
        </p>
      </div>
      <div className="space-y-3">
        <Field label="Confirm password" type="password" value={password} onChange={setPassword} />
        <Field label="Reason (optional)" type="text" value={reason} onChange={setReason} />
        <Field label='Type "DELETE" to confirm' type="text" value={confirmText} onChange={setConfirmText} />
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete my account
        </button>
      </div>
    </ModalShell>
  );
}

function Field({ label, type, value, onChange }: {
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-farumasi-500 focus:outline-none focus:ring-2 focus:ring-farumasi-100"
      />
    </label>
  );
}

/* ── PinManager ──────────────────────────────────────────────────────────── */
function PinManager() {
  const pinHash = usePinStore((s) => s.pinHash);
  const setPin = usePinStore((s) => s.setPin);
  const changePin = usePinStore((s) => s.changePin);
  const clearPin = usePinStore((s) => s.clearPin);

  const [mode, setMode] = useState<null | "set" | "change" | "remove">(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode(null);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const submitSet = async () => {
    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      toast.error("PIN must be 4-8 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      await setPin(newPin);
      toast.success("PIN set. Orders & Prescriptions are now protected.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const submitChange = async () => {
    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      toast.error("New PIN must be 4-8 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      const ok = await changePin(currentPin, newPin);
      if (!ok) {
        toast.error("Current PIN is incorrect.");
        return;
      }
      toast.success("PIN updated.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const submitRemove = async () => {
    setBusy(true);
    try {
      const ok = await clearPin(currentPin);
      if (!ok) {
        toast.error("PIN is incorrect.");
        return;
      }
      toast.success("PIN removed.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 p-3 mb-2 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            pinHash ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500",
          )}>
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Orders & Prescriptions PIN</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pinHash
                ? "Protected for your account only. Other patients on this device use their own passcode."
                : "Optional per account. Not shared with other patients on this device."}
            </p>
          </div>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            pinHash ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
          )}>
            {pinHash ? "ON" : "OFF"}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          {pinHash ? (
            <>
              <button
                onClick={() => setMode("change")}
                className="flex-1 h-9 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-xs font-bold"
              >
                Change PIN
              </button>
              <button
                onClick={() => setMode("remove")}
                className="flex-1 h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold"
              >
                Remove PIN
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode("set")}
              className="flex-1 h-9 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-xs font-bold"
            >
              Set PIN
            </button>
          )}
        </div>
      </div>

      {mode === "set" && (
        <ModalShell title="Set Orders/Prescriptions PIN" onClose={reset}>
          <div className="space-y-3">
            <Field label="New PIN (4-8 digits)" type="password" value={newPin} onChange={setNewPin} />
            <Field label="Confirm PIN" type="password" value={confirmPin} onChange={setConfirmPin} />
            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
              <button disabled={busy} onClick={submitSet} className="flex-1 h-10 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold disabled:opacity-60">
                {busy ? "Saving…" : "Set PIN"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {mode === "change" && (
        <ModalShell title="Change PIN" onClose={reset}>
          <div className="space-y-3">
            <Field label="Current PIN" type="password" value={currentPin} onChange={setCurrentPin} />
            <Field label="New PIN (4-8 digits)" type="password" value={newPin} onChange={setNewPin} />
            <Field label="Confirm new PIN" type="password" value={confirmPin} onChange={setConfirmPin} />
            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
              <button disabled={busy} onClick={submitChange} className="flex-1 h-10 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold disabled:opacity-60">
                {busy ? "Saving…" : "Update PIN"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {mode === "remove" && (
        <ModalShell title="Remove PIN" onClose={reset}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Enter your current PIN to remove protection.</p>
            <Field label="Current PIN" type="password" value={currentPin} onChange={setCurrentPin} />
            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
              <button disabled={busy} onClick={submitRemove} className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60">
                {busy ? "Removing…" : "Remove PIN"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
