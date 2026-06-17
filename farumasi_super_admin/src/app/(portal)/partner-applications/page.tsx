"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
} from "@/components/ui";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  MapPin,
  FileText,
} from "lucide-react";
import {
  partnersService,
  type BackendPartner,
} from "@/lib/services/partners.service";
import { getApiError } from "@/lib/services/auth.service";

export default function PartnerApplicationsPage() {
  const [items, setItems] = useState<BackendPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    partnersService
      .listApplications({ limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiError(err, "Failed to load partner applications")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setActingId(id);
    try {
      await partnersService.updatePartner(id, {
        verification_status: "verified",
        status: "active",
      });
      load();
    } catch (err) {
      setError(getApiError(err, "Could not approve application"));
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    if (!window.confirm("Reject this partner application? The account will remain inactive.")) return;
    setActingId(id);
    try {
      await partnersService.updatePartner(id, {
        verification_status: "rejected",
        status: "inactive",
      });
      load();
    } catch (err) {
      setError(getApiError(err, "Could not reject application"));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partner Applications"
        subtitle="Review self-service partner sign-ups, licenses, and activate approved sellers"
        breadcrumb="Compliance · Partner Applications"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Awaiting review" value={items.length} icon={ClipboardList} color="text-amber-700" />
        <StatCard
          label="With license document"
          value={items.filter((p) => p.regulatory_license_document_url).length}
          icon={FileText}
          color="text-farumasi-700"
        />
        <StatCard
          label="With map coordinates"
          value={items.filter((p) => p.latitude != null && p.longitude != null).length}
          icon={MapPin}
          color="text-emerald-700"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading applications…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">No partner applications awaiting review.</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Business</Th>
                  <Th>License</Th>
                  <Th>Location</Th>
                  <Th>Commission</Th>
                  <Th>Submitted</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <tbody>
                {items.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{p.email ?? "—"}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{p.company_type ?? "—"}</p>
                    </Td>
                    <Td>
                      <p className="text-[11px] text-slate-600">
                        {p.regulatory_authority ?? "—"}
                        {p.regulatory_license_number ? ` · ${p.regulatory_license_number}` : ""}
                      </p>
                      {p.regulatory_license_document_url ? (
                        <a
                          href={mediaUrl(p.regulatory_license_document_url)}
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
                    <Td className="text-[11px] text-slate-600">
                      <p>{p.district ?? "—"}</p>
                      {p.latitude != null && p.longitude != null && (
                        <p className="font-mono text-slate-400 mt-0.5">
                          {p.latitude}, {p.longitude}
                        </p>
                      )}
                    </Td>
                    <Td className="text-[12px] font-semibold text-slate-700">
                      {p.commission_rate_percent != null ? `${p.commission_rate_percent}%` : "10%"}
                    </Td>
                    <Td className="text-[11px] text-slate-500">{formatDate(p.created_at)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/pharmacies/companies/${p.id}`}>
                          <Button variant="outline" size="xs">Review</Button>
                        </Link>
                        <Button
                          variant="primary"
                          size="xs"
                          disabled={actingId === p.id}
                          onClick={() => void approve(p.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={actingId === p.id}
                          onClick={() => void reject(p.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
