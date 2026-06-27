"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, mediaUrl } from "@/lib/utils";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  Button,
  StatCard,
  ErrorBanner,
  FilterTabs,
} from "@/components/ui";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import {
  sellerApplicationsService,
  type SellerApplication,
} from "@/lib/services/seller-applications.service";
import { getApiError } from "@/lib/services/auth.service";
import { toast } from "sonner";

type FilterStatus = "submitted" | "under_review" | "approved" | "rejected" | "all";
const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function licenseUrl(app: SellerApplication): string | null {
  const payload = app.payload ?? {};
  const url =
    (payload.license_document_url as string | undefined) ||
    (payload.regulatory_license_document_url as string | undefined);
  return url ?? null;
}

export default function PartnerApplicationsPage() {
  const [items, setItems] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [status, setStatus] = useState<FilterStatus>("submitted");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    sellerApplicationsService
      .list({
        limit: 100,
        status: status === "all" ? undefined : status,
      })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiError(err, "Failed to load seller applications")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, nextStatus: "approved" | "rejected" | "under_review") => {
    if (nextStatus === "rejected" && !window.confirm("Reject this application?")) return;
    setActingId(id);
    try {
      await sellerApplicationsService.review(id, { status: nextStatus });
      toast.success(nextStatus === "approved" ? "Application approved" : nextStatus === "rejected" ? "Application rejected" : "Marked under review");
      load();
    } catch (err) {
      toast.error(getApiError(err, "Could not update application"));
    } finally {
      setActingId(null);
    }
  };

  const pending = items.filter((a) => a.status === "submitted" || a.status === "under_review").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Seller Applications"
        subtitle="Review pharmacy and partner applications submitted through the public form"
        breadcrumb="Compliance · Seller Applications"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="In this view" value={items.length} icon={ClipboardList} color="text-amber-700" />
        <StatCard
          label="With license document"
          value={items.filter((a) => licenseUrl(a)).length}
          icon={FileText}
          color="text-farumasi-700"
        />
        <StatCard label="Awaiting decision" value={pending} icon={Loader2} color="text-emerald-700" />
      </div>

      <FilterTabs
        options={STATUS_FILTERS.map((f) => f.label)}
        value={STATUS_FILTERS.find((f) => f.id === status)?.label ?? "Submitted"}
        onChange={(label) => {
          const next = STATUS_FILTERS.find((f) => f.label === label);
          if (next) setStatus(next.id);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading applications…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">No applications in this view.</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Applicant</Th>
                  <Th>Business</Th>
                  <Th>License</Th>
                  <Th>Submitted</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <tbody>
                {items.map((app) => {
                  const doc = licenseUrl(app);
                  return (
                    <Tr key={app.id}>
                      <Td>
                        <p className="text-[13px] font-semibold text-slate-900">{app.owner_full_name}</p>
                        <p className="text-[11px] text-slate-500">{app.owner_email}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{app.application_code}</p>
                      </Td>
                      <Td>
                        <p className="text-[13px] font-semibold text-slate-900">{app.business_name}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{app.seller_type}</p>
                        <p className="text-[11px] text-slate-400">{app.district ?? "—"}</p>
                      </Td>
                      <Td>
                        <p className="text-[11px] text-slate-600">
                          {(app.payload?.regulatory_authority as string) ?? "—"}
                          {app.payload?.license_number ? ` · ${String(app.payload.license_number)}` : ""}
                        </p>
                        {doc ? (
                          <a
                            href={mediaUrl(doc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-farumasi-700 font-medium hover:underline mt-1"
                          >
                            View document <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <Badge variant="warning" className="mt-1">No file</Badge>
                        )}
                      </Td>
                      <Td className="text-[11px] text-slate-500">
                        {app.submitted_at ? formatDate(app.submitted_at) : formatDate(app.created_at)}
                      </Td>
                      <Td>
                        <Badge variant={app.status === "approved" ? "success" : app.status === "rejected" ? "error" : "warning"}>
                          {app.status.replace("_", " ")}
                        </Badge>
                      </Td>
                      <Td>
                        {app.status === "approved" || app.status === "rejected" ? (
                          <span className="text-[11px] text-slate-400">Finalised</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={actingId === app.id}
                              onClick={() => void review(app.id, "under_review")}
                            >
                              Review
                            </Button>
                            <Button
                              variant="primary"
                              size="xs"
                              disabled={actingId === app.id}
                              onClick={() => void review(app.id, "approved")}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={actingId === app.id}
                              onClick={() => void review(app.id, "rejected")}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
