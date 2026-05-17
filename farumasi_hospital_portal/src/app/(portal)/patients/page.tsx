"use client";

import { useState } from "react";
import { Search, Users, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockPatients } from "@/data/mock";
import { formatDate, timeAgo } from "@/lib/utils";
import type { PatientStatus } from "@/types";

const STATUS_OPTS: (PatientStatus | "All")[] = ["All", "Active", "Discharged", "Referred", "Deceased"];

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PatientStatus | "All">("All");

  const filtered = mockPatients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q) || p.diagnosis.toLowerCase().includes(q);
    const matchStatus = status === "All" || p.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Patients Overview" subtitle={`${mockPatients.filter((p) => p.status === "Active").length} active patients currently admitted`} />

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${status === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {s} ({s === "All" ? mockPatients.length : mockPatients.filter((p) => p.status === s).length})
          </button>
        ))}
      </div>

      <Card className="p-4">
        <Input icon={Search} placeholder="Search patients by name, district, diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Patient</Th><Th>Age / Gender</Th><Th>District</Th><Th>Diagnosis</Th><Th>Primary Doctor</Th><Th>Department</Th><Th>Insurance</Th><Th>Status</Th><Th>Last Visit</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9}><EmptyState icon={Users} title="No patients found" /></td></tr>
            ) : (
              filtered.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.nationalId.slice(0, 14)}…</p>
                  </Td>
                  <Td className="text-slate-600">{p.age} · {p.gender}</Td>
                  <Td className="text-slate-500">{p.district}</Td>
                  <Td className="text-xs text-slate-600 max-w-[180px] truncate">{p.diagnosis}</Td>
                  <Td className="text-slate-600 text-xs">{p.primaryDoctorName}</Td>
                  <Td className="text-slate-500 text-xs">{p.departmentName}</Td>
                  <Td>
                    {p.insuranceProvider ? (
                      <Badge variant="success">{p.insuranceProvider}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={p.status === "Active" ? "success" : p.status === "Discharged" ? "default" : p.status === "Referred" ? "info" : "error"}>
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{timeAgo(p.lastVisit)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
