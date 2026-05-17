"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Puzzle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Badge, Button } from "@/components/ui";

type IntegrationStatus = "Connected" | "Disconnected" | "Pending";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  lastSync: string | null;
  vendor: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "int-001", name: "Rwanda HMIS", category: "Government", description: "Ministry of Health hospital management information system", status: "Connected", lastSync: "2024-05-16T08:30:00Z", vendor: "RBC / MoH" },
  { id: "int-002", name: "RSSB Insurance", category: "Insurance", description: "Rwanda Social Security Board insurance claims API", status: "Connected", lastSync: "2024-05-16T07:00:00Z", vendor: "RSSB" },
  { id: "int-003", name: "MMI Radiology", category: "Diagnostics", description: "Medical imaging and radiology results integration", status: "Pending", lastSync: null, vendor: "MMI Rwanda" },
  { id: "int-004", name: "LabResults Gateway", category: "Diagnostics", description: "Laboratory test results ingestion pipeline", status: "Connected", lastSync: "2024-05-15T18:00:00Z", vendor: "CDCL Rwanda" },
  { id: "int-005", name: "Mutual Health Insurance", category: "Insurance", description: "Mutuelle de Santé community health insurance", status: "Connected", lastSync: "2024-05-16T06:00:00Z", vendor: "RBC" },
  { id: "int-006", name: "SMS Alerts Gateway", category: "Communication", description: "Patient and doctor SMS notification delivery", status: "Connected", lastSync: "2024-05-16T09:00:00Z", vendor: "MTN Rwanda" },
  { id: "int-007", name: "Pharmacy POS Bridge", category: "Pharmacy", description: "Point-of-sale data sync from embedded pharmacies", status: "Connected", lastSync: "2024-05-16T08:45:00Z", vendor: "Farumasi" },
  { id: "int-008", name: "EHR Migration Tool", category: "Records", description: "Historical patient record migration from legacy EHR", status: "Disconnected", lastSync: null, vendor: "Custom" },
  { id: "int-009", name: "Payroll System", category: "HR", description: "Staff payroll and attendance sync", status: "Connected", lastSync: "2024-05-15T23:59:00Z", vendor: "Sage HR" },
];

const STATUS_OPTS: (IntegrationStatus | "All")[] = ["All", "Connected", "Pending", "Disconnected"];

const statusIcon = (s: IntegrationStatus) => {
  if (s === "Connected") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s === "Disconnected") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
};

export default function IntegrationsPage() {
  const [filter, setFilter] = useState<IntegrationStatus | "All">("All");

  const filtered = INTEGRATIONS.filter((i) => filter === "All" || i.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Integrations" subtitle="Third-party and government system connections" />

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        {[
          { label: "Connected", value: INTEGRATIONS.filter((i) => i.status === "Connected").length, color: "text-emerald-600" },
          { label: "Pending", value: INTEGRATIONS.filter((i) => i.status === "Pending").length, color: "text-amber-600" },
          { label: "Disconnected", value: INTEGRATIONS.filter((i) => i.status === "Disconnected").length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filter === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {s} ({s === "All" ? INTEGRATIONS.length : INTEGRATIONS.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((int) => (
          <Card key={int.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Puzzle className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{int.name}</h3>
                  <p className="text-xs text-slate-500">{int.vendor}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {statusIcon(int.status)}
                <span className={`text-xs font-semibold ${int.status === "Connected" ? "text-emerald-600" : int.status === "Disconnected" ? "text-red-600" : "text-amber-600"}`}>{int.status}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">{int.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="default">{int.category}</Badge>
              </div>
              <div className="text-right">
                {int.lastSync ? (
                  <p className="text-[10px] text-slate-400">Last sync: {new Date(int.lastSync).toLocaleDateString("en-RW")}</p>
                ) : (
                  <p className="text-[10px] text-slate-400">Not synced</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              {int.status === "Connected" ? (
                <>
                  <Button size="sm" variant="ghost" className="flex-1 text-xs">Sync Now</Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-xs text-red-600">Disconnect</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="flex-1 text-xs">Connect</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
