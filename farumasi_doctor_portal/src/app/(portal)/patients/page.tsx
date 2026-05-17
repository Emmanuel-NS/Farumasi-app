"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users, Search, FilePlus, ChevronRight, AlertTriangle,
  Phone, MapPin, Shield, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/index";
import { mockPatients } from "@/data/mock";
import {
  getInsuranceBadgeColor, calculateAge, formatDate, getInitials,
} from "@/lib/utils";
import type { Patient } from "@/types";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Chronic">("All");

  const filtered = useMemo(() => {
    return mockPatients.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.nationalId.includes(q) ||
        p.phone.includes(q) ||
        p.district.toLowerCase().includes(q);
      const matchesFilter =
        filter === "All" ||
        (filter === "Active" && p.status === "Active") ||
        (filter === "Chronic" && p.chronicConditions.length > 0);
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Patients"
        subtitle={`${mockPatients.length} patients under care`}
        icon={<Users className="w-5 h-5" />}
        actions={
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            New Prescription
          </Link>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, National ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
          />
        </div>
        <div className="flex gap-1.5">
          {(["All", "Active", "Chronic"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-farumasi-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((patient) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No patients match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ patient }: { patient: Patient }) {
  const age = calculateAge(patient.dateOfBirth);
  const hasChronic = patient.chronicConditions.length > 0;
  const hasAllergies = patient.allergies.length > 0;

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-farumasi-200 transition-all group block"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-farumasi-700">{getInitials(patient.fullName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{patient.fullName}</p>
          <p className="text-xs text-slate-400">{age} y/o · {patient.gender} · {patient.bloodGroup}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getInsuranceBadgeColor(patient.insurance)}`}>
          {patient.insurance}
        </span>
      </div>

      {/* Contact */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone className="w-3 h-3" />
          {patient.phone}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="w-3 h-3" />
          {patient.district}, {patient.province}
        </div>
        {patient.lastVisit && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            Last visit: {formatDate(patient.lastVisit)}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {hasChronic && patient.chronicConditions.slice(0, 2).map((c) => (
          <span key={c} className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {c}
          </span>
        ))}
        {hasAllergies && (
          <span className="text-[10px] font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            {patient.allergies.join(", ")}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Shield className="w-3 h-3" />
          {patient.prescriptionCount} prescriptions
        </div>
        <div className="flex items-center gap-1 text-xs text-farumasi-600 font-medium group-hover:text-farumasi-700">
          View Profile <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}
