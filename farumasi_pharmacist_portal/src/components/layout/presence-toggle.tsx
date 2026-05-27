"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Availability = "available" | "busy" | "offline";

const OPTIONS: { value: Availability; label: string; dot: string; desc: string }[] = [
  { value: "available", label: "Available", dot: "bg-green-500", desc: "Patients can chat now" },
  { value: "busy",      label: "Busy",      dot: "bg-amber-400", desc: "Visible but slower replies" },
  { value: "offline",   label: "Offline",   dot: "bg-slate-300", desc: "Hidden from consult list" },
];

const STORAGE_KEY = "farumasi_pharmacist_presence";

export function PresenceToggle() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Availability>("offline");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load current status from profile (fallback to cached value for snappy UI)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached === "available" || cached === "busy" || cached === "offline") {
        setValue(cached);
      }
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/pharmacists/me");
        if (cancelled) return;
        const a = (data?.availability_status ?? "offline") as Availability;
        setValue(a);
        try { localStorage.setItem(STORAGE_KEY, a); } catch {}
      } catch {
        /* user may not yet have a profile — keep cached */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Heartbeat: while user keeps the portal open and is not offline, ping
  // the backend every 2 minutes so last_login_at stays fresh and patients
  // continue to see them as online.
  useEffect(() => {
    if (value === "offline") return;
    const ping = () => { api.get("/users/me").catch(() => {}); };
    const id = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [value]);

  const choose = async (next: Availability) => {
    if (next === value || saving) { setOpen(false); return; }
    const prev = value;
    setValue(next);
    setOpen(false);
    setSaving(true);
    try {
      await api.patch("/pharmacists/me/availability", { availability_status: next });
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      toast.success(`You're now ${next === "offline" ? "offline" : next === "busy" ? "busy" : "available"}.`);
    } catch {
      setValue(prev);
      toast.error("Could not update availability.");
    } finally {
      setSaving(false);
    }
  };

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[2];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 h-9 text-xs font-bold transition-colors",
          "bg-white/15 text-white hover:bg-white/25 disabled:opacity-50",
        )}
        title="Set your availability"
      >
        <span className={cn("w-2 h-2 rounded-full", current.dot)} />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Your availability
          </p>
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", opt.dot)} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                  <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                </span>
                {active && <Check className="w-4 h-4 text-farumasi-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
