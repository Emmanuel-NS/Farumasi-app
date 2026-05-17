"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Send, User, ArrowLeft, Phone, MapPin, FileText,
  CheckCircle2, Clock, Plus,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { mockReferrals, mockPatients } from "@/data/mock";
import { formatDate, getInitials } from "@/lib/utils";

const SPECIALTIES = [
  "Nephrology", "Cardiology", "Endocrinology", "Neurology", "Oncology",
  "Pulmonology", "Gastroenterology", "Orthopedics", "Dermatology",
  "Ophthalmology", "ENT", "Psychiatry", "Pediatrics",
];

export default function ReferralsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    specialty: "",
    reason: "",
    urgency: "Routine" as "Routine" | "Urgent" | "Emergency",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.specialty || !form.reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Referral submitted successfully");
    setShowForm(false);
    setForm({ patientId: "", specialty: "", reason: "", urgency: "Routine", notes: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Referrals"
        subtitle="Specialist referral management"
        icon={<Send className="w-5 h-5" />}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Referral
          </button>
        }
      />

      {/* New referral form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-farumasi-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">New Referral</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Patient <span className="text-red-500">*</span></label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                >
                  <option value="">Select patient...</option>
                  {mockPatients.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Specialty <span className="text-red-500">*</span></label>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                >
                  <option value="">Select specialty...</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Urgency</label>
                <select
                  value={form.urgency}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Reason <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Progressive CKD, specialist evaluation"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Clinical Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Additional clinical context for the specialist..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2.5 text-sm bg-farumasi-600 text-white rounded-lg hover:bg-farumasi-700 font-medium flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Submit Referral
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing referrals */}
      <div className="space-y-4">
        {mockReferrals.map((referral) => (
          <div key={referral.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900">{referral.patientName}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    referral.urgency === "Emergency" ? "bg-red-100 text-red-700" :
                    referral.urgency === "Urgent" ? "bg-amber-100 text-amber-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{referral.urgency}</span>
                </div>
                <p className="text-sm text-slate-700">{referral.toSpecialty}</p>
                <p className="text-xs text-slate-500 mt-0.5">{referral.reason}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                referral.status === "Accepted" ? "bg-green-100 text-green-700" :
                referral.status === "Pending" ? "bg-amber-100 text-amber-700" :
                referral.status === "Completed" ? "bg-farumasi-100 text-farumasi-700" :
                "bg-red-100 text-red-700"
              }`}>{referral.status}</span>
            </div>
            {referral.clinicalSummary && (
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 italic">{referral.clinicalSummary}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-2">Referred: {formatDate(referral.createdAt)}</p>
          </div>
        ))}
        {mockReferrals.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-100">
            <Send className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No referrals yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
