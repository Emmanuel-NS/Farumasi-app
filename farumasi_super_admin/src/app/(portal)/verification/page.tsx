"use client";

import { useState } from "react";
import { mockVerifications } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, FilterTabs, StatCard, Button } from "@/components/ui";
import { BadgeCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { VerificationStatus } from "@/types";

const STATUS_FILTERS: (VerificationStatus | "All")[] = ["All", "Pending", "In Review", "Approved", "Rejected"];

export default function VerificationPage() {
  const [status, setStatus] = useState<VerificationStatus | "All">("All");

  const filtered = status === "All" ? mockVerifications : mockVerifications.filter(v => v.status === status);
  const pending = mockVerifications.filter(v => v.status === "Pending").length;
  const inReview = mockVerifications.filter(v => v.status === "In Review").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Verification Center" subtitle="Document review and entity verification management" breadcrumb="Compliance">
        <div className="flex gap-2">
          <Badge variant="warning">{pending} Pending</Badge>
          <Badge variant="info">{inReview} In Review</Badge>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending} icon={Clock} color="text-amber-700" />
        <StatCard label="In Review" value={inReview} icon={BadgeCheck} color="text-blue-700" />
        <StatCard label="Approved" value={mockVerifications.filter(v => v.status === "Approved").length} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Rejected" value={mockVerifications.filter(v => v.status === "Rejected").length} icon={XCircle} color="text-red-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-farumasi-600" /><CardTitle>Verification Queue</CardTitle></div>
          <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Entity</Th>
              <Th>Type</Th>
              <Th>Documents</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Submitted</Th>
              <Th>Reviewer</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-500">{v.entityName.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-900">{v.entityName}</p>
                  </div>
                </Td>
                <Td><Badge variant="default">{v.entityType}</Badge></Td>
                <Td className="text-[12px] text-slate-600">{v.documents.length} docs</Td>
                <Td>
                  <Badge variant={v.status === "Approved" ? "success" : v.status === "Pending" ? "warning" : v.status === "In Review" ? "info" : "error"}>{v.status}</Badge>
                </Td>
                <Td>
                  <Badge variant={v.priority === "Urgent" ? "error" : v.priority === "High" ? "warning" : "neutral"}>{v.priority}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(v.submittedAt)}</Td>
                <Td className="text-[12px] text-slate-500">{v.reviewer ?? "—"}</Td>
                <Td>
                  {(v.status === "Pending" || v.status === "In Review") && (
                    <div className="flex gap-1">
                      <Button variant="success" size="xs"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                      <Button variant="destructive" size="xs"><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
