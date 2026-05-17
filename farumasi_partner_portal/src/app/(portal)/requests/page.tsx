"use client";

import { FileSearch, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProductRequests } from "@/data/mock";
import { formatDate, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function RequestsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Product Requests"
        description="Submit and track requests to add new products to the FARUMASI catalogue"
        icon={FileSearch}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("Opening new product request form…")}>
            <Plus className="w-4 h-4" /> New Request
          </Button>
        }
      />

      <div className="space-y-4">
        {mockProductRequests.map(req => (
          <Card key={req.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{req.productName}</CardTitle>
                  {req.genericName && <p className="text-xs text-muted-foreground mt-0.5">{req.genericName} · {req.brand}</p>}
                </div>
                <StatusBadge status={req.status} type="request" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><p className="text-muted-foreground">Manufacturer</p><p className="font-medium">{req.manufacturer}</p></div>
                <div><p className="text-muted-foreground">Country</p><p className="font-medium">{req.manufacturerCountry}</p></div>
                <div><p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{req.category.replace("_", " ")}</p></div>
                <div><p className="text-muted-foreground">Suggested Price</p><p className="font-medium">RWF {req.suggestedPrice?.toLocaleString()}</p></div>
              </div>

              {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}

              {req.reviewNotes && (
                <div className={`rounded-lg px-3 py-2 text-xs ${req.status === "approved" ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                  <span className="font-semibold">Review Note: </span>{req.reviewNotes}
                  {req.reviewedBy && <span className="ml-1 text-muted-foreground">— {req.reviewedBy}</span>}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Submitted {req.submittedAt ? timeAgo(req.submittedAt) : "—"}</span>
                <div className="flex gap-2">
                  {req.requiresPrescription && <Badge variant="warning">Rx Required</Badge>}
                  {req.dosageForm && <Badge variant="neutral">{req.dosageForm}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
