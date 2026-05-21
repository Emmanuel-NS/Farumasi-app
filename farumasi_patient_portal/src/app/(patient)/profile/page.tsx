"use client";

import { useState } from "react";
import { mockUser, mockBookings } from "@/data/mock";
import { getInitials, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import type { T } from "@/lib/translations";
import { Edit2, Save, X, Calendar, MapPin, Clock, CheckCircle } from "lucide-react";

function getBookingStatusLabel(status: string, t: T): string {
  const key = `status_${status.toLowerCase()}` as keyof T;
  return (t[key] as string) ?? status;
}

export default function ProfilePage() {
  const t = useTranslation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: mockUser.phone ?? "+250 788 000 000",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.profile_title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.profile_subtitle}</p>
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-farumasi-600 flex items-center justify-center text-2xl font-extrabold text-white shadow-lg">
            {getInitials(form.name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{form.name}</h2>
            <p className="text-sm text-farumasi-600 font-medium mt-0.5">{t.profile_patient}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-farumasi-500" />
              <span className="text-xs text-slate-500">{t.profile_active}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <FormField label={t.profile_full_name} value={form.name} editing={editing} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <FormField label={t.profile_email} value={form.email} editing={editing} type="email" onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <FormField label={t.profile_phone} value={form.phone} editing={editing} type="tel" onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 text-farumasi-700 bg-farumasi-50 border border-farumasi-100 rounded-2xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t.profile_updated}</span>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 h-10 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {t.profile_cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-10 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t.profile_save}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 h-10 px-5 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 text-sm font-semibold hover:bg-farumasi-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t.profile_edit}
            </button>
          )}
        </div>
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-farumasi-600" />
          {t.profile_appointments}
        </h3>
        {mockBookings.length === 0 ? (
          <p className="text-sm text-slate-500">{t.profile_no_appts}</p>
        ) : (
          <div className="space-y-3">
            {mockBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-sm shrink-0">
                  {b.pharmacistName.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{b.pharmacistName}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(b.date).toLocaleDateString()} at {b.time}
                  </p>
                </div>
                <span className="text-xs font-bold text-farumasi-700 bg-farumasi-100 px-2 py-0.5 rounded-full shrink-0">
                  {getBookingStatusLabel(b.status, t)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">{t.profile_quick_links}</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/orders" icon="📦" label={t.profile_my_orders} />
          <QuickLink href="/prescriptions" icon="📄" label={t.profile_prescriptions} />
          <QuickLink href="/settings" icon="⚙️" label={t.nav_settings} />
          <QuickLink href="/consult" icon="💬" label={t.nav_consult} />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, editing, type = "text", onChange }: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
        />
      ) : (
        <p className="text-sm text-slate-900 py-2.5 px-4 bg-slate-50 rounded-xl">{value}</p>
      )}
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-2xl hover:bg-farumasi-50 hover:border-farumasi-100 border border-transparent transition-all group"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-semibold text-slate-700 group-hover:text-farumasi-700">{label}</span>
    </a>
  );
}
