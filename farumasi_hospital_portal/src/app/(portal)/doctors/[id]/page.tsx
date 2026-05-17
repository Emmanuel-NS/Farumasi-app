"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, BadgeCheck, Activity, Clock,
  ShieldAlert, ShieldOff, ShieldCheck, RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Table, Thead, Th, Td, Tr } from "@/components/ui";
import { mockDoctors, mockPrescriptions } from "@/data/mock";
import { doctorStatusColor, prescriptionStatusColor, formatDate, timeAgo, getRateColor } from "@/lib/utils";

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const doc = mockDoctors.find((d) => d.id === id);

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-semibold text-slate-700">Doctor not found</p>
        <Link href="/doctors" className="mt-4 text-sm text-farumasi-600 hover:underline">← Back to Doctors</Link>
      </div>
    );
  }

  const doctorRx = mockPrescriptions.filter((rx) => rx.doctorId === doc.id);

  const actions = [
    { label: "Verify", icon: ShieldCheck, color: "text-emerald-600", visible: doc.status === "Pending Verification" },
    { label: "Restrict", icon: ShieldAlert, color: "text-orange-600", visible: doc.status === "Active" },
    { label: "Suspend", icon: ShieldOff, color: "text-red-600", visible: ["Active", "Restricted"].includes(doc.status) },
    { label: "Restore", icon: RotateCcw, color: "text-blue-600", visible: ["Restricted", "Suspended"].includes(doc.status) },
  ].filter((a) => a.visible);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-2">
        <Link href="/doctors">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" />Doctors</Button>
        </Link>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-wrap gap-6 items-start">
          <div className="w-16 h-16 rounded-2xl bg-farumasi-100 flex items-center justify-center text-farumasi-700 text-xl font-bold shrink-0">
            {doc.name.split(" ").slice(-2).map((w: string) => w[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{doc.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${doctorStatusColor(doc.status)}`}>{doc.status}</span>
            </div>
            <p className="text-base text-slate-500">{doc.specialty} · {doc.departmentName}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" />{doc.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" />{doc.phone}</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-farumasi-500" />{doc.licenseNumber}</span>
            </div>
            {doc.notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">{doc.notes}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {actions.map((a) => (
              <Button key={a.label} variant="outline" size="sm" className={a.color}>
                <a.icon className="w-4 h-4" />{a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Prescriptions", value: doc.totalPrescriptions },
          { label: "Fulfillment Rate", value: doc.fulfillmentRate > 0 ? `${doc.fulfillmentRate}%` : "—" },
          { label: "Avg Response", value: doc.avgResponseTime > 0 ? `${doc.avgResponseTime}m` : "—" },
          { label: "Joined", value: formatDate(doc.joinedAt) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Doctor Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Qualification", value: doc.qualification },
              { label: "National ID", value: doc.nationalId },
              { label: "Department", value: doc.departmentName },
              { label: "Last Active", value: timeAgo(doc.lastActive) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 text-right">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Fulfillment Rate</span>
                <span className={`font-semibold ${getRateColor(doc.fulfillmentRate)}`}>{doc.fulfillmentRate}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${doc.fulfillmentRate >= 95 ? "bg-emerald-500" : doc.fulfillmentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${doc.fulfillmentRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Activity Level</span>
                <span className="font-semibold text-slate-700">{Math.min(100, Math.round((doc.totalPrescriptions / 156) * 100))}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, Math.round((doc.totalPrescriptions / 156) * 100))}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prescription History */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription History</CardTitle>
          <Badge>{doctorRx.length} prescriptions</Badge>
        </CardHeader>
        <Table>
          <Thead>
            <tr><Th>Patient</Th><Th>Diagnosis</Th><Th>Priority</Th><Th>Status</Th><Th>Date</Th></tr>
          </Thead>
          <tbody>
            {doctorRx.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No prescriptions found</td></tr>
            ) : (
              doctorRx.map((rx) => (
                <Tr key={rx.id}>
                  <Td className="font-medium">{rx.patientName}</Td>
                  <Td className="text-slate-500 text-xs max-w-[200px] truncate">{rx.diagnosis}</Td>
                  <Td><Badge variant={rx.priority === "Urgent" ? "error" : rx.priority === "High" ? "warning" : "default"}>{rx.priority}</Badge></Td>
                  <Td><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${prescriptionStatusColor(rx.status)}`}>{rx.status}</span></Td>
                  <Td className="text-slate-500 text-xs">{formatDate(rx.createdAt)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
