"use client";

import { useState } from "react";
import { Search, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockPrescriptions } from "@/data/mock";
import { prescriptionStatusColor, formatDate, timeAgo } from "@/lib/utils";
import type { PrescriptionStatus } from "@/types";

const STATUS_OPTS: (PrescriptionStatus | "All")[] = ["All", "Pending", "Sent", "Partially Fulfilled", "Fulfilled", "Failed", "Expired"];

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PrescriptionStatus | "All">("All");

  const filtered = mockPrescriptions.filter((rx) => {
    const q = search.toLowerCase();
    const matchSearch = !q || rx.patientName.toLowerCase().includes(q) || rx.doctorName.toLowerCase().includes(q) || rx.diagnosis.toLowerCase().includes(q);
    const matchStatus = status === "All" || rx.status === status;
    return matchSearch && matchStatus;
  });

  const counts = STATUS_OPTS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockPrescriptions.length : mockPrescriptions.filter((rx) => rx.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Prescription Oversight" subtitle={`${mockPrescriptions.filter((rx) => rx.status === "Pending" || rx.status === "Sent").length} prescriptions active`} />

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${status === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {s} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <Input icon={Search} placeholder="Search by patient, doctor, or diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Rx ID</Th><Th>Patient</Th><Th>Doctor</Th><Th>Department</Th><Th>Priority</Th><Th>Status</Th><Th>Items</Th><Th>Created</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={ClipboardList} title="No prescriptions found" /></td></tr>
            ) : (
              filtered.map((rx) => (
                <Tr key={rx.id}>
                  <Td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{rx.id}</code></Td>
                  <Td className="font-medium text-slate-900">{rx.patientName}</Td>
                  <Td className="text-slate-600 text-sm">{rx.doctorName}</Td>
                  <Td className="text-slate-500 text-xs">{rx.departmentName}</Td>
                  <Td>
                    <Badge variant={rx.priority === "Urgent" ? "error" : rx.priority === "High" ? "warning" : "default"}>{rx.priority}</Badge>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${prescriptionStatusColor(rx.status)}`}>{rx.status}</span>
                  </Td>
                  <Td className="text-center font-medium">{rx.items.length}</Td>
                  <Td className="text-xs text-slate-500">{timeAgo(rx.createdAt)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
