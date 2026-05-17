"use client";
import {
  Shield, Clock, User, FileText, Eye, PenSquare,
  LogIn, Trash2, Download, Search,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { mockAuditLogs } from "@/data/mock";
import { formatDateTime } from "@/lib/utils";

const ACTION_ICONS: Record<string, React.ElementType> = {
  Login: LogIn,
  ViewPatient: Eye,
  CreatePrescription: PenSquare,
  CreateClinicalNote: FileText,
  DeleteRecord: Trash2,
  ExportReport: Download,
};

const ACTION_COLORS: Record<string, string> = {
  Login: "bg-green-50 text-green-700",
  ViewPatient: "bg-blue-50 text-blue-700",
  CreatePrescription: "bg-farumasi-50 text-farumasi-700",
  CreateClinicalNote: "bg-purple-50 text-purple-700",
  DeleteRecord: "bg-red-50 text-red-700",
  ExportReport: "bg-amber-50 text-amber-700",
};

export default function AuditPage() {
  const [search, setSearch] = useState("");

  const filtered = mockAuditLogs.filter((log) => {
    const q = search.toLowerCase();
    return (
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.resourceType.toLowerCase().includes(q) ||
      log.ipAddress.includes(q) ||
      (log.resourceLabel && log.resourceLabel.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Security & Audit Log"
        subtitle="Complete audit trail of all clinical actions"
        icon={<Shield className="w-5 h-5" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: mockAuditLogs.length, icon: FileText, color: "text-farumasi-600" },
          { label: "Logins", value: mockAuditLogs.filter(l => l.action === "Login").length, icon: LogIn, color: "text-green-600" },
          { label: "Patient Views", value: mockAuditLogs.filter(l => l.action === "ViewPatient").length, icon: Eye, color: "text-blue-600" },
          { label: "Prescriptions", value: mockAuditLogs.filter(l => l.action === "CreatePrescription").length, icon: PenSquare, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search audit events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        />
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Audit Trail ({filtered.length} events)</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map((log) => {
            const Icon = ACTION_ICONS[log.action] ?? FileText;
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-600"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-medium text-slate-800">{log.action.replace(/([A-Z])/g, " $1").trim()}</p>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ""}</p>
                  {log.resourceLabel && <p className="text-xs text-slate-400 mt-0.5">{log.resourceLabel}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400">IP: {log.ipAddress}</span>
                    {log.userAgent && <span className="text-[10px] text-slate-400 truncate">{log.userAgent}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
