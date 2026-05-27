"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getInitials, cn } from "@/lib/utils";
import { Edit, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  pharmacistsService,
  type BackendPharmacistProfile,
} from "@/lib/services/pharmacists.service";
import {
  pharmaciesService,
  type BackendPharmacy,
} from "@/lib/services/pharmacies.service";

const INP =
  "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all disabled:bg-slate-50 disabled:text-slate-500";

export default function PharmacistProfilePage() {
  const storeUser = useAuthStore((s) => s.user);
  const setStoreUser = useAuthStore((s) => s.setUser);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);

  const [profile, setProfile]   = useState<BackendPharmacistProfile | null>(null);
  const [pharmacy, setPharmacy] = useState<BackendPharmacy | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    specialization: "",
    bio: "",
    years_of_experience: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: me }, prof, pharm] = await Promise.all([
          api.get<{ id: string; full_name: string; email: string; phone?: string; role: string }>("/users/me"),
          pharmacistsService.getMyProfile(),
          pharmaciesService.getMyPharmacy().catch(() => null),
        ]);
        if (cancelled) return;
        setProfile(prof);
        setPharmacy(pharm);
        setForm({
          full_name: me.full_name ?? "",
          phone: me.phone ?? "",
          specialization: prof?.specialization ?? "",
          bio: prof?.bio ?? "",
          years_of_experience: prof?.years_of_experience != null ? String(prof.years_of_experience) : "",
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cancel = () => {
    setForm({
      full_name: storeUser?.full_name ?? "",
      phone: storeUser?.phone ?? "",
      specialization: profile?.specialization ?? "",
      bio: profile?.bio ?? "",
      years_of_experience: profile?.years_of_experience != null ? String(profile.years_of_experience) : "",
    });
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: updatedUser } = await api.put("/users/me", {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      });
      setStoreUser?.(updatedUser);

      if (profile) {
        const years = form.years_of_experience.trim();
        const updated = await pharmacistsService.updateMyProfile({
          specialization: form.specialization.trim() || null,
          bio: form.bio.trim() || null,
          years_of_experience: years === "" ? null : Number(years),
        });
        setProfile(updated);
      }

      toast.success("Profile updated");
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-farumasi-600" />
      </div>
    );
  }

  const role = storeUser?.role ?? "Pharmacist";
  const roleLabel = role.replace(/_/g, " ");

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-5 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-farumasi-600 flex items-center justify-center mb-3">
          <span className="text-white font-extrabold text-2xl">{getInitials(form.full_name || storeUser?.full_name || "P")}</span>
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">{form.full_name || storeUser?.full_name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-slate-500 capitalize">{roleLabel}</span>
          {pharmacy && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-medium text-farumasi-700">{pharmacy.name}</span>
            </>
          )}
        </div>
        {profile?.license_number && (
          <span className="mt-2 text-xs font-bold text-farumasi-600 bg-farumasi-50 px-3 py-1 rounded-full border border-farumasi-100">
            License: {profile.license_number}
          </span>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Account Information</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-farumasi-600 font-semibold hover:underline">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} disabled={saving} className="flex items-center gap-1 text-sm text-slate-500 font-semibold hover:underline disabled:opacity-50">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1 text-sm text-farumasi-600 font-bold hover:underline disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              disabled={!editing}
              className={INP}
            />
          </Field>
          <Field label="Email">
            <input type="email" value={storeUser?.email ?? ""} disabled className={INP} />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              disabled={!editing}
              className={INP}
            />
          </Field>

          {profile && (
            <>
              <Field label="Specialization">
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
                  disabled={!editing}
                  placeholder="e.g. Clinical Pharmacy"
                  className={INP}
                />
              </Field>
              <Field label="Years of Experience">
                <input
                  type="number"
                  min={0}
                  value={form.years_of_experience}
                  onChange={(e) => setForm((p) => ({ ...p, years_of_experience: e.target.value }))}
                  disabled={!editing}
                  className={INP}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  disabled={!editing}
                  placeholder="A short professional bio shown to patients."
                  className={cn(INP, "h-auto py-2 resize-none")}
                />
              </Field>
            </>
          )}

          {pharmacy && (
            <Field label="Pharmacy">
              <input value={pharmacy.name} disabled className={INP} />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
