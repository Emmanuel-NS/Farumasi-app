"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockReferrals } from "@/data/mock";
import { referralStatusColor, priorityColor, formatDate, timeAgo } from "@/lib/utils";
import type { ReferralStatus } from "@/types";

const STATUS_OPTS: (ReferralStatus | "All")[] = ["All", "Pending", "Accepted", "Rejected", "Completed", "Cancelled"];

export default function ReferralsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReferralStatus | "All">("All");

  const filtered = mockReferrals.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.patientName.toLowerCase().includes(q) || r.toSpecialty.toLowerCase().includes(q) || r.fromDoctorName.toLowerCase().includes(q);
    const matchStatus = status === "All" || r.status === status;
    return matchSearch && matchStatus;
  });

  const counts = STATUS_OPTS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockReferrals.length : mockReferrals.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Referral Management" subtitle={`${counts["Pending"]} pending referrals requiring action`} />

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${status === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <Card className="p-4">
        <Input icon={Search} placeholder="Search by patient, department, doctor..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Patient</Th><Th>From Dept.</Th><Th>To Specialty</Th><Th>Referred By</Th><Th>Priority</Th><Th>Status</Th><Th>Clinical Summary</Th><Th>Date</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={ArrowRight} title="No referrals found" /></td></tr>
            ) : (
              filtered.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-slate-900">{r.patientName}</Td>
                  <Td className="text-slate-500 text-sm">{r.fromDepartmentName}</Td>
                  <Td>
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <ArrowRight className="w-3.5 h-3.5 text-farumasi-500" />{r.toSpecialty}
                    </div>
                  </Td>
                  <Td className="text-slate-600 text-sm">{r.fromDoctorName}</Td>
                  <Td>
                    <Badge variant={r.priority === "Urgent" ? "error" : r.priority === "High" ? "warning" : "default"}>{r.priority}</Badge>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${referralStatusColor(r.status)}`}>{r.status}</span>
                  </Td>
                  <Td className="text-xs text-slate-500 max-w-[180px] truncate">{r.clinicalSummary}</Td>
                  <Td className="text-xs text-slate-500">{timeAgo(r.createdAt)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
