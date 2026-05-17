"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Search, Filter, UserCheck, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, Table, Thead, Th, Td, Tr, Input, Badge, EmptyState } from "@/components/ui";
import { mockDoctors } from "@/data/mock";
import { doctorStatusColor, formatDate, getRateColor, getInitials, timeAgo } from "@/lib/utils";
import type { DoctorStatus } from "@/types";

const STATUS_FILTERS: (DoctorStatus | "All")[] = ["All", "Active", "Pending Verification", "Restricted", "Suspended", "Archived"];

export default function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoctorStatus | "All">("All");
  const [deptFilter, setDeptFilter] = useState("All");

  const departments = ["All", ...Array.from(new Set(mockDoctors.map((d) => d.departmentName)))];

  const filtered = mockDoctors.filter((d) => {
    const matchSearch = !search || [d.name, d.specialty, d.licenseNumber, d.email].some((f) => f.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    const matchDept = deptFilter === "All" || d.departmentName === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockDoctors.length : mockDoctors.filter((d) => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Doctor Management" subtitle={`${mockDoctors.length} doctors registered at KUTH`}>
        <Link href="/doctors/new">
          <Button>
            <UserPlus className="w-4 h-4" />
            Add Doctor
          </Button>
        </Link>
      </PageHeader>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${statusFilter === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {s} {counts[s] > 0 && <span className={`text-[10px] ${statusFilter === s ? "text-white/80" : "text-slate-400"}`}>({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            icon={Search}
            placeholder="Search by name, specialty, license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-600/30"
            >
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <span className="text-sm text-slate-500 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Doctor</Th>
              <Th>Department</Th>
              <Th>License</Th>
              <Th>Prescriptions</Th>
              <Th>Fulfillment</Th>
              <Th>Last Active</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={UserCheck} title="No doctors found" description="Try adjusting your search or filters" /></td></tr>
            ) : (
              filtered.map((doc) => (
                <Tr key={doc.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-farumasi-100 flex items-center justify-center text-farumasi-700 text-xs font-bold shrink-0">
                        {getInitials(doc.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500">{doc.specialty}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{doc.departmentName}</Td>
                  <Td>
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{doc.licenseNumber}</code>
                  </Td>
                  <Td className="font-medium">{doc.totalPrescriptions}</Td>
                  <Td>
                    <span className={`font-semibold ${getRateColor(doc.fulfillmentRate)}`}>
                      {doc.fulfillmentRate > 0 ? `${doc.fulfillmentRate}%` : "—"}
                    </span>
                  </Td>
                  <Td className="text-slate-500 text-xs">{timeAgo(doc.lastActive)}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${doctorStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </Td>
                  <Td>
                    <Link href={`/doctors/${doc.id}`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
