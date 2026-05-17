"use client";

import { useState } from "react";
import { mockPharmacist } from "@/data/mock";
import { getInitials, cn } from "@/lib/utils";
import { Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function PharmacistProfilePage() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: mockPharmacist.name,
    email: mockPharmacist.email,
    phone: mockPharmacist.phone,
  });
  const [saved, setSaved] = useState(form);

  const cancel = () => { setForm(saved); setEditing(false); };
  const save = () => { setSaved(form); setEditing(false); toast.success("Profile updated"); };

  const inp = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

      {/* Avatar card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-farumasi-600 flex items-center justify-center mb-3">
          <span className="text-white font-extrabold text-2xl">{getInitials(saved.name)}</span>
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">{saved.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-slate-500 capitalize">{mockPharmacist.role.replace(/_/g, " ")}</span>
          <span className="text-slate-300">·</span>
          <span className="text-sm font-medium text-farumasi-700">{mockPharmacist.pharmacyName}</span>
        </div>
        <span className="mt-2 text-xs font-bold text-farumasi-600 bg-farumasi-50 px-3 py-1 rounded-full border border-farumasi-100">
          {mockPharmacist.pharmacyCity}
        </span>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Account Information</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-farumasi-600 font-semibold hover:underline">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} className="flex items-center gap-1 text-sm text-slate-500 font-semibold hover:underline">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={save} className="flex items-center gap-1 text-sm text-farumasi-600 font-bold hover:underline">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {([["Full Name", "name", "text"], ["Email", "email", "email"], ["Phone", "phone", "tel"]] as const).map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                disabled={!editing}
                className={inp}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pharmacy</label>
            <input value={mockPharmacist.pharmacyName} disabled className={inp} />
          </div>
        </div>
      </div>
    </div>
  );
}
