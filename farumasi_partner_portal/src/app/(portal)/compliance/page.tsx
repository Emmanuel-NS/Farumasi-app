"use client";

import React from "react";
import { Shield, Upload, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockComplianceDocs } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; badgeVariant: "success" | "warning" | "error" | "info" | "neutral" }> = {
  valid: { icon: CheckCircle2, label: "Valid", color: "text-green-600", bg: "bg-green-50", badgeVariant: "success" },
  expiring_soon: { icon: AlertTriangle, label: "Expiring Soon", color: "text-amber-600", bg: "bg-amber-50", badgeVariant: "warning" },
  expired: { icon: AlertTriangle, label: "Expired", color: "text-red-600", bg: "bg-red-50", badgeVariant: "error" },
  under_review: { icon: Clock, label: "Under Review", color: "text-blue-600", bg: "bg-blue-50", badgeVariant: "info" },
  pending_review: { icon: Clock, label: "Pending Review", color: "text-blue-600", bg: "bg-blue-50", badgeVariant: "info" },
};

export default function CompliancePage() {
  const expiringCount = mockComplianceDocs.filter(d => d.status === "expiring_soon" || d.status === "expired").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Compliance & Documents"
        description="Manage your regulatory documents, licenses, and certifications"
        icon={Shield}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("Opening document upload…")}>
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </Button>
        }
      />

      {expiringCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">{expiringCount} document{expiringCount !== 1 ? "s" : ""} require{expiringCount === 1 ? "s" : ""} attention — expiring or expired</p>
        </div>
      )}

      <div className="space-y-3">
        {mockComplianceDocs.map(doc => {
          const cfg = statusConfig[doc.status];
          const Icon = cfg.icon;

          return (
            <Card key={doc.id} className={`border ${doc.status === "expiring_soon" ? "border-amber-200" : doc.status === "expired" ? "border-red-200" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{doc.type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-xs">
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium">{formatDate(doc.uploadedAt, true)}</p>
                  </div>
                  {doc.expiryDate && (
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className={`font-medium ${cfg.color}`}>{formatDate(doc.expiryDate, true)}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast.info(`Viewing ${doc.name}`)}>View</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast.info(`Replace ${doc.name} — select file`)}>
                    <Upload className="w-3 h-3 mr-1" /> Replace
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
