"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ClipboardList, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Table, Thead, Th, Td, Tr } from "@/components/ui";
import { mockDepartments, mockDoctors, mockPrescriptions } from "@/data/mock";
import { doctorStatusColor, prescriptionStatusColor, getRateColor, timeAgo } from "@/lib/utils";

export default function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dept = mockDepartments.find((d) => d.id === id);

  if (!dept) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-semibold text-slate-700">Department not found</p>
        <Link href="/departments" className="mt-4 text-sm text-farumasi-600 hover:underline">← Back</Link>
      </div>
    );
  }

  const doctors = mockDoctors.filter((d) => d.departmentId === id);
  const recentRx = mockPrescriptions.filter((rx) => rx.departmentId === id).slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-2">
        <Link href="/departments"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" />Departments</Button></Link>
      </div>

      <PageHeader title={dept.name} subtitle={`${dept.floor} · Extension ${dept.extension} · Head: ${dept.headName}`}>
        <Badge variant={dept.status === "Active" ? "success" : "default"}>{dept.status}</Badge>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Doctors", value: dept.totalDoctors },
          { label: "Active Prescriptions", value: dept.activePrescriptions },
          { label: "Total Prescriptions", value: dept.totalPrescriptions },
          { label: "Fulfillment Rate", value: `${dept.fulfillmentRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Doctors */}
        <Card>
          <CardHeader><CardTitle>Doctors ({doctors.length})</CardTitle></CardHeader>
          <div className="divide-y divide-slate-50">
            {doctors.map((doc) => (
              <Link key={doc.id} href={`/doctors/${doc.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center text-farumasi-700 text-xs font-bold shrink-0">
                  {doc.name.split(" ").slice(-2).map((w: string) => w[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">{doc.specialty}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold ${getRateColor(doc.fulfillmentRate)}`}>{doc.fulfillmentRate > 0 ? `${doc.fulfillmentRate}%` : "—"}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${doctorStatusColor(doc.status)}`}>{doc.status.split(" ")[0]}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Prescriptions */}
        <Card>
          <CardHeader><CardTitle>Recent Prescriptions</CardTitle></CardHeader>
          <div className="divide-y divide-slate-50">
            {recentRx.map((rx) => (
              <div key={rx.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{rx.patientName}</p>
                  <p className="text-xs text-slate-500 truncate">{rx.doctorName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${prescriptionStatusColor(rx.status)}`}>{rx.status}</span>
                  <span className="text-xs text-slate-400">{timeAgo(rx.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
