"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, FilterTabs, StatCard, Button } from "@/components/ui";
import { BadgeCheck, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { pharmaciesService } from "@/lib/services/pharmacies.service";
import { toast } from "sonner";

interface BackendPharmacy {
  id: string;
  name: string;
  district?: string | null;
  status?: string | null;
  verification_status?: string | null;
  created_at?: string;
}

type FilterStatus = "All" | "pending" | "verified" | "rejected";
const STATUS_FILTERS: FilterStatus[] = ["All", "pending", "verified", "rejected"];

export default function VerificationPage() {
  const [pharmacies, setPharmacies] = useState<BackendPharmacy[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<FilterStatus>("All");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: BackendPharmacy[]; total: number }>("/pharmacies/", { params: { limit: 100, offset: 0 } })
      .then((r) => { setPharmacies(r.data.items); setTotal(r.data.total); })
      .catch(() => toast.error("Failed to load pharmacies"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setActingId(id);
    try {
      await pharmaciesService.updatePharmacyAdmin(id, {
        verification_status: "verified",
        status: "active",
      });
      toast.success("Pharmacy verified");
      load();
    } catch {
      toast.error("Could not approve pharmacy");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    if (!window.confirm("Reject this pharmacy verification?")) return;
    setActingId(id);
    try {
      await pharmaciesService.updatePharmacyAdmin(id, {
        verification_status: "rejected",
        status: "inactive",
      });
      toast.success("Pharmacy rejected");
      load();
    } catch {
      toast.error("Could not reject pharmacy");
    } finally {
      setActingId(null);
    }
  };

  const filtered = status === "All"
    ? pharmacies
    : pharmacies.filter((p) => (p.verification_status ?? "pending") === status);

  const pending = pharmacies.filter((p) => !p.verification_status || p.verification_status === "pending").length;
  const verified = pharmacies.filter((p) => p.verification_status === "verified").length;
  const rejected = pharmacies.filter((p) => p.verification_status === "rejected").length;

  const verBadge = (vs?: string | null) => {
    if (vs === "verified") return "success";
    if (vs === "rejected") return "error";
    return "warning";
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Verification Center" subtitle="Pharmacy and entity verification management" breadcrumb="Compliance">
        <div className="flex gap-2">
          <Badge variant="warning">{pending} Pending</Badge>
          <Badge variant="success">{verified} Verified</Badge>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending} icon={Clock} color="text-amber-700" />
        <StatCard label="Verified" value={verified} icon={BadgeCheck} color="text-blue-700" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} color="text-red-700" />
        <StatCard label="Total" value={total} icon={CheckCircle2} color="text-emerald-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-farumasi-600" /><CardTitle>Pharmacy Verification Queue</CardTitle></div>
          <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Pharmacy</Th>
              <Th>District</Th>
              <Th>Status</Th>
              <Th>Verification</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={5} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={5} className="text-center py-8 text-sm text-slate-400">No pharmacies in this category.</Td></Tr>
            )}
            {!loading && filtered.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-500">{v.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-900">{v.name}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{v.district ?? "—"}</Td>
                <Td><Badge variant={v.status === "active" ? "success" : "neutral"}>{v.status ?? "—"}</Badge></Td>
                <Td>
                  <Badge variant={verBadge(v.verification_status) as "success" | "warning" | "error"}>
                    {v.verification_status ?? "pending"}
                  </Badge>
                </Td>
                <Td>
                  {(!v.verification_status || v.verification_status === "pending") && (
                    <div className="flex gap-1">
                      <Button
                        variant="success"
                        size="xs"
                        disabled={actingId === v.id}
                        onClick={() => void approve(v.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={actingId === v.id}
                        onClick={() => void reject(v.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
