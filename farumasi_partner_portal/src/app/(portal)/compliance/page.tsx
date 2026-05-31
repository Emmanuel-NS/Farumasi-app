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
