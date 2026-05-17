"use client";

import { mockPrescriptions } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { FileText, CheckCircle2, Clock } from "lucide-react";

export default function PrescriptionsPage() {
  const active = mockPrescriptions.filter(p => p.status === "Pending").length;
  const dispensed = mockPrescriptions.filter(p => p.status === "Fulfilled").length;
  const expired = mockPrescriptions.filter(p => p.status === "Expired").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Prescription Coordination" subtitle="All prescriptions and dispensing status" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={active} icon={Clock} color="text-blue-700" />
        <StatCard label="Fulfilled" value={dispensed} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Expired" value={expired} icon={FileText} color="text-red-700" />
        <StatCard label="Total" value={mockPrescriptions.length} icon={FileText} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Prescription Records</CardTitle>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Patient</Th>
              <Th>Doctor</Th>
              <Th>Pharmacy</Th>
              <Th>Items</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Created</Th>
            </tr>
          </Thead>
          <tbody>
            {mockPrescriptions.map((p) => (
              <Tr key={p.id}>
                <Td className="text-[11px] font-mono text-slate-600">{p.id}</Td>
                <Td className="text-[12px] font-semibold text-slate-900">{p.patientName}</Td>
                <Td className="text-[12px] text-slate-600">{p.doctorName}</Td>
                <Td className="text-[12px] text-slate-500">{p.pharmacyName || "—"}</Td>
                <Td className="text-[12px] text-slate-600">{p.items}</Td>
                <Td>
                  <Badge variant={p.status === "Fulfilled" ? "success" : p.status === "Pending" ? "info" : p.status === "Expired" ? "error" : "neutral"}>{p.status}</Badge>
                </Td>
                <Td><Badge variant={p.priority === "Urgent" ? "error" : p.priority === "High" ? "warning" : "neutral"}>{p.priority}</Badge></Td>
                <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
