"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, SearchInput } from "@/components/ui";
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface PharmacyRow {
  id: string;
  name: string;
  license_number?: string | null;
  district?: string | null;
  status: string;
  verification_status?: string | null;
  owner_user_id?: string | null;
  created_at: string;
}
interface PaginatedPharmacies { items: PharmacyRow[]; total: number }

export default function CompliancePage() {
  const [pharmacies, setPharmacies] = useState<PharmacyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<PaginatedPharmacies>("/pharmacies/", { params: { limit: 200 } })
      .then(r => setPharmacies(r.data.items))
      .catch(() => setPharmacies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = pharmacies.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.district ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const compliant = pharmacies.filter(p => p.verification_status === "verified").length;
  const pending = pharmacies.filter(p => p.verification_status === "pending" || !p.verification_status).length;
  const nonCompliant = pharmacies.filter(p => ["rejected","suspended"].includes(p.verification_status ?? "")).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Compliance Monitoring" subtitle="Pharmacy verification and regulatory status" breadcrumb="Compliance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Verified" value={compliant} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Non-Compliant" value={nonCompliant} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Pending Review" value={pending} icon={ShieldCheck} color="text-amber-700" />
        <StatCard label="Total Entities" value={pharmacies.length} icon={ShieldCheck} color="text-slate-700" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading compliance data…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-farumasi-600" /><CardTitle>Pharmacy Compliance Status</CardTitle></div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search pharmacies..." className="w-48" />
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Pharmacy</Th>
                <Th>District</Th>
                <Th>License</Th>
                <Th>Verification</Th>
                <Th>Status</Th>
                <Th>Registered</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-sm text-slate-400 py-8">No pharmacies found.</Td></Tr>
              ) : filtered.map(p => (
                <Tr key={p.id}>
                  <Td className="text-[12px] font-semibold text-slate-900">{p.name}</Td>
                  <Td className="text-[12px] text-slate-500">{p.district ?? "—"}</Td>
                  <Td className="text-[11px] font-mono text-slate-500">{p.license_number ?? "—"}</Td>
                  <Td>
                    <Badge variant={p.verification_status === "verified" ? "success" : ["rejected","suspended"].includes(p.verification_status ?? "") ? "error" : "warning"}>
                      {p.verification_status ?? "pending"}
                    </Badge>
                  </Td>
                  <Td><Badge variant={p.status === "active" ? "success" : p.status === "suspended" ? "error" : "neutral"}>{p.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(p.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
