"use client";

import { useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockCompliance } from "@/data/mock";
import { complianceStatusColor, formatDate } from "@/lib/utils";
import type { ComplianceStatus } from "@/types";

const STATUS_OPTS: (ComplianceStatus | "All")[] = ["All", "Compliant", "Non-Compliant", "Pending", "Expired"];

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ComplianceStatus | "All">("All");

  const filtered = mockCompliance.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.entityName.toLowerCase().includes(q) || c.checkType.toLowerCase().includes(q) || c.entityType.toLowerCase().includes(q);
    const matchStatus = status === "All" || c.status === status;
    return matchSearch && matchStatus;
  });

  const counts = STATUS_OPTS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockCompliance.length : mockCompliance.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Compliance Records" subtitle="Regulatory compliance across KUTH departments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Compliant", value: counts["Compliant"], color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Non-Compliant", value: counts["Non-Compliant"], color: "text-red-600", bg: "bg-red-50" },
          { label: "Pending", value: counts["Pending"], color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Expired", value: counts["Expired"], color: "text-slate-500", bg: "bg-slate-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-slate-100 p-4`}>
            <p className="text-xs text-slate-600">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-1`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input icon={Search} placeholder="Search entity, check type..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
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
            <tr><Th>Entity</Th><Th>Type</Th><Th>Check</Th><Th>Status</Th><Th>Due Date</Th><Th>Completed</Th><Th>Verified By</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={CheckCircle2} title="No compliance records found" /></td></tr>
            ) : (
              filtered.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-semibold text-slate-900">{c.entityName}</Td>
                  <Td><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{c.entityType}</span></Td>
                  <Td className="text-slate-600 text-sm">{c.checkType}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${complianceStatusColor(c.status)}`}>{c.status}</span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(c.dueDate)}</Td>
                  <Td className="text-xs text-slate-500">{c.completedAt ? formatDate(c.completedAt) : "—"}</Td>
                  <Td className="text-xs text-slate-600">{c.verifiedBy ?? "—"}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}


