"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Search, FilePlus, ChevronRight,
  Phone, FileText, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { patientsService, type DerivedPatient } from "@/lib/services/patients.service";
import { getInitials, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<DerivedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patientsService.getPatients();
      setPatients(data);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });
  }, [search, patients]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Patients"
        subtitle={loading ? "Loading…" : `${patients.length} patients under care`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/prescriptions/new"
              className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New Prescription
            </Link>
          </div>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, phone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((patient) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No patients match your search" : "No patients found"}
            </p>
          </div>
        )}
        {loading && (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-4 border-farumasi-200 border-t-farumasi-600 rounded-full animate-spin mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ patient }: { patient: DerivedPatient }) {
  return (
    <Link
      href={`/patients/${patient.id}`}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-farumasi-200 transition-all group block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-farumasi-700">{getInitials(patient.fullName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{patient.fullName}</p>
          <p className="text-xs text-slate-400 truncate">{patient.email}</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
          Active
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone className="w-3 h-3" />
          {patient.phone}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <FileText className="w-3 h-3" />
          {patient.prescriptionCount} prescription{patient.prescriptionCount !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          Last: {timeAgo(patient.lastPrescriptionAt)}
        </div>
      </div>
    </Link>
  );
}
