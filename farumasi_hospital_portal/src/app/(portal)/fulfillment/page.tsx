"use client";

import { useState } from "react";
import { Search, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockFulfillmentRecords } from "@/data/mock";
import { fulfillmentStatusColor, formatDateTime } from "@/lib/utils";
import type { FulfillmentStatus } from "@/types";

const STATUS_OPTS: (FulfillmentStatus | "All")[] = ["All", "Pending", "Fulfilled", "Partially Fulfilled", "Failed", "Cancelled"];

export default function FulfillmentPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FulfillmentStatus | "All">("All");

  const filtered = mockFulfillmentRecords.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.patientName.toLowerCase().includes(q) || f.pharmacyName.toLowerCase().includes(q) || f.doctorName.toLowerCase().includes(q);
    const matchStatus = status === "All" || f.status === status;
    return matchSearch && matchStatus;
  });

  const counts = STATUS_OPTS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockFulfillmentRecords.length : mockFulfillmentRecords.filter((f) => f.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Fulfillment Tracking" subtitle="Monitor prescription-to-pharmacy delivery chain" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: counts["Pending"], color: "text-blue-600" },
          { label: "Partially Fulfilled", value: counts["Partially Fulfilled"], color: "text-amber-600" },
          { label: "Fulfilled", value: counts["Fulfilled"], color: "text-emerald-600" },
          { label: "Failed", value: counts["Failed"], color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-1`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input icon={Search} placeholder="Search by patient, doctor or pharmacy..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${status === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Record ID</Th><Th>Patient</Th><Th>Doctor</Th><Th>Pharmacy</Th><Th>Status</Th><Th>Items</Th><Th>Processing</Th><Th>Completed</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={PackageCheck} title="No fulfillment records found" /></td></tr>
            ) : (
              filtered.map((f) => (
                <Tr key={f.id}>
                  <Td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{f.id}</code></Td>
                  <Td className="font-medium text-slate-900">{f.patientName}</Td>
                  <Td className="text-slate-600 text-sm">{f.doctorName}</Td>
                  <Td className="text-slate-500 text-sm">{f.pharmacyName}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${fulfillmentStatusColor(f.status)}`}>{f.status}</span>
                  </Td>
                  <Td className="text-center text-sm">
                    <span className="font-medium">{f.itemsFulfilled}</span>
                    <span className="text-slate-400">/{f.itemsTotal}</span>
                  </Td>
                  <Td className="text-xs text-slate-500">{f.processingTime}m</Td>
                  <Td className="text-xs text-slate-500">{f.completedAt ? formatDateTime(f.completedAt) : "—"}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}


