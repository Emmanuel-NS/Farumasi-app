"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs } from "@/components/ui";
import { Building2, Loader2 } from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  hospital_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  status: string;
  verification_status: string;
  license_number?: string | null;
  created_at: string;
}

const STATUS_FILTERS = ["All", "active", "inactive", "suspended"] as const;

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    api.get<Hospital[]>("/hospitals/", { params: { limit: 100 } })
      .then(r => setHospitals(r.data))
      .catch(() => setHospitals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = hospitals.filter(h => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || (h.district ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Hospitals" subtitle={loading ? "Loading…" : `${hospitals.length} registered hospitals`} breadcrumb="Platform Management" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading hospitals…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Hospital Management</CardTitle>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <FilterTabs options={STATUS_FILTERS as unknown as string[]} value={statusFilter} onChange={setStatusFilter} />
              <SearchInput value={search} onChange={setSearch} placeholder="Search hospitals..." className="w-48" />
            </div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Hospital</Th>
                <Th>District</Th>
                <Th>Type</Th>
                <Th>Verification</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-sm text-slate-400 py-8">No hospitals found.</Td></Tr>
              ) : filtered.map(h => (
                <Tr key={h.id}>
                  <Td>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{h.name}</p>
                      <p className="text-[10px] text-slate-400">{h.email ?? h.license_number ?? "—"}</p>
                    </div>
                  </Td>
                  <Td className="text-[12px] text-slate-500">{h.district ?? "—"}</Td>
                  <Td><Badge variant="default">{h.hospital_type ?? "General"}</Badge></Td>
                  <Td><Badge variant={h.verification_status === "verified" ? "success" : h.verification_status === "pending" ? "warning" : "neutral"}>{h.verification_status}</Badge></Td>
                  <Td><Badge variant={h.status === "active" ? "success" : h.status === "suspended" ? "error" : "neutral"}>{h.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(h.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
