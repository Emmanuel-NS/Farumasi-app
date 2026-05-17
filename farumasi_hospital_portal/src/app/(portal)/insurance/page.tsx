"use client";

import { useState } from "react";
import { Search, CreditCard, Clock, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockInsuranceClaims } from "@/data/mock";
import { formatRWF, formatDate } from "@/lib/utils";

const STATUS_OPTS = ["All", "Pending", "Under Review", "Approved", "Rejected"];

export default function InsurancePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const filtered = mockInsuranceClaims.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.patientName.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q);
    const matchStatus = status === "All" || c.status === status;
    return matchSearch && matchStatus;
  });

  const totalAmount = mockInsuranceClaims.reduce((s, c) => s + c.amount, 0);
  const approvedAmount = mockInsuranceClaims.filter((c) => c.status === "Approved").reduce((s, c) => s + c.amount, 0);
  const pending = mockInsuranceClaims.filter((c) => c.status === "Pending" || c.status === "Under Review").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Insurance Insights" subtitle="Claims and reimbursement tracking across all insurance providers" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Claims Value", value: formatRWF(totalAmount), icon: CreditCard, color: "text-slate-900" },
          { label: "Approved Value", value: formatRWF(approvedAmount), icon: CheckCircle, color: "text-emerald-600" },
          { label: "Pending / Under Review", value: pending, icon: Clock, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color} mt-0.5`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input icon={Search} placeholder="Search by patient or provider..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${status === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s} ({s === "All" ? mockInsuranceClaims.length : mockInsuranceClaims.filter((c) => c.status === s).length})
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Claim ID</Th><Th>Patient</Th><Th>Provider</Th><Th>Amount</Th><Th>Status</Th><Th>Submitted</Th><Th>Processed</Th><Th>Rejection</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={CreditCard} title="No claims found" /></td></tr>
            ) : (
              filtered.map((c) => (
                <Tr key={c.id}>
                  <Td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{c.id}</code></Td>
                  <Td className="font-medium text-slate-900">{c.patientName}</Td>
                  <Td className="text-slate-600 text-sm">{c.provider}</Td>
                  <Td className="font-semibold text-slate-900">{formatRWF(c.amount)}</Td>
                  <Td>
                    <Badge variant={c.status === "Approved" ? "success" : c.status === "Rejected" ? "error" : c.status === "Under Review" ? "warning" : "info"}>
                      {c.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(c.submittedAt)}</Td>
                  <Td className="text-xs text-slate-500">{c.processedAt ? formatDate(c.processedAt) : "—"}</Td>
                  <Td className="text-xs text-red-500 max-w-[160px] truncate">{c.rejectionReason ?? "—"}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}


