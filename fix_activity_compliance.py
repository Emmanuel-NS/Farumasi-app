import os

# ─── ACTIVITY PAGE ───────────────────────────────────────────
activity = r'''
"use client";

import { useState, useEffect } from "react";
import { Activity, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  user?: { id: string; full_name: string; role: string } | null;
  created_at: string;
}

const roleColors: Record<string, string> = {
  partner_company_admin: "bg-farumasi-100 text-farumasi-700",
  pharmacy_admin: "bg-blue-100 text-blue-700",
  pharmacist: "bg-purple-100 text-purple-700",
  super_admin: "bg-amber-100 text-amber-700",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLog[]>("/audit/", { params: { limit: 50 } })
      .then(r => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of all actions performed in your portal"
        icon={Activity}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading activity…
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No activity logs found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {logs.map((log, i) => {
              const actor = log.user?.full_name ?? "System";
              const role = log.user?.role ?? "system";
              const initials = actor.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {initials}
                    </div>
                    {i < logs.length - 1 && (
                      <span className="absolute left-[17px] top-9 bottom-0 w-px bg-border -mb-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{log.action.replace(/_/g, " ")}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColors[role] ?? "bg-slate-100 text-slate-600"}`}>
                        {actor}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                    )}
                    {log.entity_type && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
'''.lstrip()

# ─── COMPLIANCE PAGE ─────────────────────────────────────────
compliance = r'''
"use client";

import React, { useState, useEffect } from "react";
import { Shield, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface PartnerCompany {
  id: string;
  name: string;
  registration_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  district?: string | null;
  verification_status?: string | null;
  status?: string | null;
  created_at?: string | null;
}

const verificationConfig: Record<string, { icon: React.ElementType; label: string; badgeVariant: "success" | "warning" | "error" | "info" | "neutral"; bg: string }> = {
  verified:       { icon: CheckCircle2, label: "Verified",       badgeVariant: "success", bg: "bg-green-50"  },
  pending:        { icon: Clock,        label: "Pending Review",  badgeVariant: "info",    bg: "bg-blue-50"   },
  under_review:   { icon: Clock,        label: "Under Review",    badgeVariant: "info",    bg: "bg-blue-50"   },
  rejected:       { icon: AlertTriangle, label: "Rejected",       badgeVariant: "error",   bg: "bg-red-50"    },
  suspended:      { icon: AlertTriangle, label: "Suspended",      badgeVariant: "error",   bg: "bg-red-50"    },
};

export default function CompliancePage() {
  const [company, setCompany] = useState<PartnerCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PartnerCompany>("/partners/me")
      .then(r => setCompany(r.data))
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const vStatus = company?.verification_status ?? "pending";
  const cfg = verificationConfig[vStatus] ?? verificationConfig["pending"];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Compliance & Verification"
        description="Your partner company regulatory status and registration details"
        icon={Shield}
      />

      {/* Verification status banner */}
      <Card className={`border-2 ${vStatus === "verified" ? "border-green-200" : vStatus === "rejected" || vStatus === "suspended" ? "border-red-200" : "border-blue-200"}`}>
        <CardContent className="py-5 flex items-center gap-4">
          <div className={`p-3 rounded-full ${cfg.bg}`}>
            <StatusIcon className={`w-6 h-6 ${vStatus === "verified" ? "text-green-600" : vStatus === "rejected" || vStatus === "suspended" ? "text-red-600" : "text-blue-600"}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{company?.name ?? "Your Company"}</p>
              <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vStatus === "verified"
                ? "Your account is fully verified and approved to operate on the Farumasi platform."
                : vStatus === "rejected"
                ? "Your verification was rejected. Please contact support for details."
                : vStatus === "suspended"
                ? "Your account has been suspended. Please contact support."
                : "Your verification is currently under review. We will notify you when it is complete."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {[
            { label: "Company Name",        value: company?.name },
            { label: "Registration Number", value: company?.registration_number ?? "—" },
            { label: "Contact Email",        value: company?.contact_email ?? "—" },
            { label: "Contact Phone",        value: company?.contact_phone ?? "—" },
            { label: "Address",             value: company?.address ?? "—" },
            { label: "District",            value: company?.district ?? "—" },
            { label: "Account Status",      value: company?.status ?? "—" },
            { label: "Member Since",        value: company?.created_at ? formatDate(company.created_at, true) : "—" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-right">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        For document uploads and certification management, please contact Farumasi support.
      </p>
    </div>
  );
}
'''.lstrip()

with open(r'C:/Users/PC/Farumasi-app/farumasi_partner_portal/src/app/(portal)/activity/page.tsx', 'w', encoding='utf-8') as f:
    f.write(activity)
print('Activity done')

with open(r'C:/Users/PC/Farumasi-app/farumasi_partner_portal/src/app/(portal)/compliance/page.tsx', 'w', encoding='utf-8') as f:
    f.write(compliance)
print('Compliance done')
